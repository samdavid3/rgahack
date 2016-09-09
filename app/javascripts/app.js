var accounts;
var account;

(function($){
  $(function(){

    $('.button-collapse').sideNav();

  }); // end of document ready
})(jQuery); // end of jQuery name space

(function() {
  $("#range").slider({
    range: "min",
    min: 0,
    max: 100,
    value: 50,
    slide: function(e, ui) {
      return $(".ui-slider-handle").html(ui.value);
    }
  });

  $(".ui-slider-handle").html("50");

}).call(this);

function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

function refreshBalance() {
  var meta = MetaCoin.deployed();

  meta.getBalance.call(account, {from: account}).then(function(value) {
    var balance_element = document.getElementById("balance");
    balance_element.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting balance; see log.");
  });
};

function submitRequest() {
  var meta = InsuranceContract.deployed();
  
  var age = document.getElementById("age");
  var gender = document.getElementById("gender");
  var zip = document.getElementById("zip");
  var height = document.getElementById("height");
  var weight = document.getElementById("weight");
  var tobacco = document.getElementById("tobacco");
  var lengthOfProtection = document.getElementById("lengthOfProtection");
  var dmvRecords = document.getElementById("dmvRecords");
  var medicalHistory = document.getElementById("medicalHistory");
  var coverageRequested = document.getElementById("coverageRequested");
  
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

  meta.submitRequest(age, gender, zip, height, weight, tobacco, lengthOfProtection, dmvRecords, medicalHistory, coverageRequested, {from: account}).then(function() {
    setStatus("Transaction complete!");
    meta.InsuranceRequested().watch( (err, resp) => {
        console.log(resp.args.age)
         setStatus(resp.args.age.toNumber());
    }
    )
  }).catch(function(e) {
    console.log(e);
    setStatus("Error sending coin; see log.");
  });
};

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

    refreshBalance();
  });
}
