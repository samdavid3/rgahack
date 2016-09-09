var accounts;
var account;
var account1;
var account2;
var account3;
var account4;
var account5;
var quoteCount = 0;
var funeralCost = 0;

var quotes = [];

(function($) {
  $(function() {
    $('.button-collapse').sideNav();
  }); // end of document ready
})(jQuery); // end of jQuery name space




function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

function outputUpdate(vol) {
  document.querySelector('#height').value = vol;
}

function refreshBalance() {
  var meta = MetaCoin.deployed();

  meta.getBalance.call(account, {
    from: account
  }).then(function(value) {
    var balance_element = document.getElementById("balance");
    balance_element.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting balance; see log.");
  });
};

function submitRequest() {
  var meta = InsuranceContract.deployed();

  var age = $("#age").val();
  var gender = $("#gender").val();
  var zip = $("#zip").val();
  var height = $("#height").val();
  var weight = $("#weight").val();
  var tobacco = $("#tobacco").val();
  var lengthOfProtection = $("#lengthOfProtection").val();
  var dmvRecords = $("#dmvRecords").val();
  var medicalHistory = $("#medicalHistory").val();
  var coverageRequested = $("#coverageRequested").val();

  age = 54;
  gender = "Male";
  zip = 50263;
  height = "6'4";
  weight = 195;
  tobacco = true;
  lengthOfProtection = 24;
  dmvRecords = true;
  medicalHistory = false;
  coverageRequested = 100000;


  setStatus("Initiating transaction... (please wait)");

  meta.submitRequest(age, gender, zip, height, weight, tobacco, lengthOfProtection, dmvRecords, medicalHistory, coverageRequested, {
    from: account
  }).then(function() {
    setStatus("Transaction complete!");
    window.location.replace("showquotes.html");
  }).catch(function(e) {
    console.log(e);
    setStatus("Error requesting quote.");
  });

};

function queryForQuotes() {
  var meta = InsuranceContract.deployed();
  meta.getNumberOfQuotes.call(account, {
    from: account
  }).then(function(value) {
    console.log(value.toNumber());
    getEachQuote(value.toNumber());
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting balance; see log.");
  });
}

function getEachQuote ( numberOfQuotes ) {
  var meta = InsuranceContract.deployed();
  
  for ( var i; i < numberOfQuotes; i++ ) {
    meta.getQuotes.call(account, i, {
      from: account
    }).then(function(value) {
      console.log(value.args[2]);
    }).catch(function(e) {
      console.log(e);
      setStatus("Error getting balance; see log.");
    });
  }
}

function startListening() {
  console.log("I'm listening");
  var meta = InsuranceContract.deployed();
  meta.InsuranceRequested().watch((err, resp) => {
    addQuotes();
  })
}

function listenForQuotes() {
  var meta = InsuranceContract.deployed();
  meta.InsuranceQuoted().watch((err, resp) => {
    var companyName = web3.toAscii(resp.args.companyName);
    console.log(companyName.trim().length);
    if ( quoteCount > 0) {
      quotes.push(web3.toAscii(resp.args.companyName));
    }
    quoteCount++;
    console.log(web3.toAscii(resp.args.companyName));
    showQuotes();
  })

}

function showQuotes() {
  var quoteString = "";
  quotes.map(quote => {
    console.log(typeof quote);
    quoteString = quoteString + '<li class="collection-item"><i class="material-icons">send</i> ' + quote + "</li>";
    console.log(quoteString);
  })
  $('#quoteValues').html(quoteString);
}


function addQuotes() {
  var meta = InsuranceContract.deployed();
  setTimeout(function() {
    meta.submitQuote(account, web3.toHex("RGA Reinsurance"), 200000, 1000000, {
      from: account1
    }).then(function() {
      setStatus("Transaction complete!");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
  }, 10000)

  setTimeout(function() {
    meta.submitQuote(account, web3.toHex("Principal"), 100000, 2000000, {
      from: account1
    }).then(function() {
      setStatus("Transaction complete!");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
  }, 2000)

  setTimeout(function() {
    meta.submitQuote(account, web3.toHex("Prudential"), 400000, 500000, {
      from: account1
    }).then(function() {
      setStatus("Transaction complete!");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
  }, 3000)


  setTimeout(function() {
    meta.submitQuote(account, web3.toHex("IBM Bluemix Insurance"), 2000000000, 500, {
      from: account1
    }).then(function() {
      setStatus("Transaction complete!");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
  }, 4000)
}

window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];
    account1 = accounts[1];
    account2 = accounts[2];
    account3 = accounts[3];
    account4 = accounts[4];
    account5 = accounts[5];

    queryForQuotes();

    listenForQuotes();

    $("#coverageDetailsBox").hide();
    $("#optionalBox").hide();
  });



  $("#personalInfoTab").click(function() {
    $("#personalInfoBox").show();
    $("#coverageDetailsBox").hide();
    $("#optionalBox").hide();
  });

  $("#coverageDetailsTab").click(function() {
    $("#personalInfoBox").hide();
    $("#coverageDetailsBox").show();
    $("#optionalBox").hide();
  });

  $("#optionalTab").click(function() {
    $("#personalInfoBox").hide();
    $("#coverageDetailsBox").hide();
    $("#optionalBox").show();
  });
}
 