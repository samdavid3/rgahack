var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("InsuranceContract error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("InsuranceContract error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("InsuranceContract contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of InsuranceContract: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to InsuranceContract.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: InsuranceContract not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "requestor",
            "type": "address"
          }
        ],
        "name": "getNumberOfQuotes",
        "outputs": [
          {
            "name": "count",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "age",
            "type": "uint256"
          },
          {
            "name": "gender",
            "type": "bytes32"
          },
          {
            "name": "zip",
            "type": "uint256"
          },
          {
            "name": "height",
            "type": "bytes32"
          },
          {
            "name": "weight",
            "type": "uint256"
          },
          {
            "name": "tobaccoUse",
            "type": "bool"
          },
          {
            "name": "lengthOfProtection",
            "type": "uint256"
          },
          {
            "name": "dmvRecords",
            "type": "bool"
          },
          {
            "name": "medicalHistory",
            "type": "bool"
          },
          {
            "name": "coverageRequested",
            "type": "uint256"
          }
        ],
        "name": "submitRequest",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "requests",
        "outputs": [
          {
            "name": "age",
            "type": "uint256"
          },
          {
            "name": "gender",
            "type": "bytes32"
          },
          {
            "name": "zip",
            "type": "uint256"
          },
          {
            "name": "height",
            "type": "bytes32"
          },
          {
            "name": "weight",
            "type": "uint256"
          },
          {
            "name": "tobaccoUse",
            "type": "bool"
          },
          {
            "name": "lengthOfProtection",
            "type": "uint256"
          },
          {
            "name": "dmvRecords",
            "type": "bool"
          },
          {
            "name": "medicalHistory",
            "type": "bool"
          },
          {
            "name": "coverageRequested",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "requestor",
            "type": "address"
          },
          {
            "name": "companyName",
            "type": "bytes32"
          },
          {
            "name": "monthlyPremium",
            "type": "uint256"
          },
          {
            "name": "coverageOffered",
            "type": "uint256"
          }
        ],
        "name": "submitQuote",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "requestor",
            "type": "address"
          },
          {
            "name": "index",
            "type": "uint256"
          }
        ],
        "name": "getQuotes",
        "outputs": [
          {
            "name": "",
            "type": "address"
          },
          {
            "name": "",
            "type": "bytes32"
          },
          {
            "name": "",
            "type": "uint256"
          },
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "type": "function"
      },
      {
        "inputs": [],
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "requestor",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "age",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "gender",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "zip",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "height",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "weight",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "tobaccoUse",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "lengthOfProtection",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "dmvRecords",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "medicalHistory",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "coverageRequested",
            "type": "uint256"
          }
        ],
        "name": "InsuranceRequested",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "requestor",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "companyName",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "monthlyPremium",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "coverageOffered",
            "type": "uint256"
          }
        ],
        "name": "InsuranceQuoted",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052610450806100126000396000f3606060405260e060020a6000350463348b54cb81146100475780637043bcc41461007757806374adad1d14610198578063acdffae6146101f3578063e785f45b1461028d575b005b600160a060020a036004351660009081526020819052604090206009015460408051918252519081900360200190f35b61004560043560243560443560643560843560a43560c43560e435610104356101243533600160a060020a0316600081815260208181526040918290208d8155600181018d9055600281018c9055600381018b9055600481018a905560058101805460ff199081168b179091556006820189905560078201805461010089810261ff0019929094168b1791909116929092179055600890910185905582519384529083018d90528282018c9052606083018b9052608083018a905260a0830189905287151560c084015260e08301879052851515908301528315156101208301526101408201839052517f60094e1d066d25d436e7eb94d679e76cac297d5f13a6faf5bc0d27aab4478b68918190036101600190a150505050505050505050565b6000602081905260048035825260409091208054600182015460028301546003840154948401546005850154600686015460078701546008909701546103049896979596949560ff938416938082169261010090920416908a565b610045600435602435604435606435600160a060020a038416600090815260208190526040902060090180546001810180835582818380158290116103895760040281600402836000526020600020918201910161038991905b8082111561044c57805473ffffffffffffffffffffffffffffffffffffffff1916815560006001820181905560028201819055600382015560040161024d565b610358600435602435600160a060020a038216600090815260208190526040812060090180548291829182918291879081101561000257600091825260209091206004919091020180546001820154600283015460039390930154600160a060020a03929092169a90995091975095509350505050565b604080519a8b5260208b0199909952898901979097526060890195909552608088019390935290151560a087015260c0860152151560e0850152151561010084015261012083015251908190036101400190f35b60408051600160a060020a039590951685526020850193909352838301919091526060830152519081900360800190f35b5050509190906000526020600020906004020160005060408051608081810183523380835260208381018a90528385018990526060938401889052855473ffffffffffffffffffffffffffffffffffffffff191682178655600186018a9055600286018990556003959095018790558351600160a060020a0391909116815293840188905283830187905290830185905290517f1d6376efb5768191ddf99b6f88e6c4afce156c84ab26661eb50accef9b515ae79350918290030190a150505050565b509056",
    "events": {
      "0x60094e1d066d25d436e7eb94d679e76cac297d5f13a6faf5bc0d27aab4478b68": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "requestor",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "age",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "gender",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "zip",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "height",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "weight",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "tobaccoUse",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "lengthOfProtection",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "dmvRecords",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "medicalHistory",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "coverageRequested",
            "type": "uint256"
          }
        ],
        "name": "InsuranceRequested",
        "type": "event"
      },
      "0x1d6376efb5768191ddf99b6f88e6c4afce156c84ab26661eb50accef9b515ae7": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "requestor",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "companyName",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "monthlyPremium",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "coverageOffered",
            "type": "uint256"
          }
        ],
        "name": "InsuranceQuoted",
        "type": "event"
      }
    },
    "updated_at": 1473446229565,
    "links": {},
    "address": "0xc89ce4735882c9f0f0fe26686c53074e09b0d550"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "InsuranceContract";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.InsuranceContract = Contract;
  }
})();
