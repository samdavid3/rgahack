var accounts;
var account;
var account1;
var account2;
var account3;
var account4;
var account5;
var quoteCount = 0;
var funeralCost = 0;

var companyNames = ["Principal"
, "Metropolitan Life"
, "American International"
, "The Hartford Financial"
, "Northwestern Mutual"
, "Prudential Insurance"
, "New York Life Insurance"
, "AEGON USA Inc."
, "Lincoln National Corp."
, "John Hancock Mutual"
, "Massachusetts Mutual"
, "Axa Insurance Group"
, "State Farm Insurance"]

var quotes = [];

var quoteObjects = [];

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
  });
}

function getEachQuote(numberOfQuotes) {
  var meta = InsuranceContract.deployed();

  for (var i = 0; i < numberOfQuotes - 1; i++) {
    meta.getQuotes.call(account, i, {
      from: account
    }).then(function(value) {
      console.log(web3.toAscii(value[1]));
      var foundCompany = false;
      for (var i = 0; i < quoteObjects.length; i++) {
        if (quoteObjects[i].companyName == web3.toAscii(value[1])) {
          foundCompany = true;
        }
      }
      if (!foundCompany) {
        var quote = {
          companyName: web3.toAscii(value[1]),
          premium: value[2].toNumber(),
          coverage: value[3].toNumber()
        };
        quoteObjects.push(quote);
        showQuotes(quote);
      }
    }).catch(function(e) {
      console.log(e);
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

function removeAllQuotes() {
  console.log("I'm listening");
  var meta = InsuranceContract.deployed();
    meta.removeQuotes({
      from: account
    }).then(function() {
      setStatus("Deleted all quotes");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
}

function listenForQuotes() {
  var meta = InsuranceContract.deployed();
  console.log("listening for quotes");
  meta.InsuranceQuoted().watch((err, resp) => {
    if (!(resp.args.coverageOffered.toNumber() == 50263) ) {
      var foundCompany = false;
      for (var i = 0; i < quoteObjects.length - 1; i++) {
        if (quoteObjects[i].companyName == web3.toAscii(resp.args.companyName)) {
          foundCompany = true;
        }
      }
      if (!foundCompany) {
        var quote = {
          companyName: web3.toAscii(resp.args.companyName),
          premium: resp.args.monthlyPremium.toNumber(),
          coverage: resp.args.coverageOffered.toNumber()
        };
        quoteObjects.push(quote);
        showQuotes(quote);
      }
    }
  })
}

function showQuotes(quote) {
  var quoteString =
    '<li class="collection-item avatar">' +
    '<i class="material-icons circle blue">assignment_ind</i>' +
    '<span class="title"><h5>' + quote.companyName + '</h5></span>' +
    '<p>Premium: ' + numeral(quote.premium).format('$0,0.00') + '<br>' +
    'Coverage: ' + numeral(quote.coverage).format('$0,0.00') +
    '</p>' +
    '<button id="send" class="secondary-content btn-large waves-effect waves-light right-align orange">Apply<i class="material-icons right">send</i></button>' +
    '</li>'
  $('#noQuotes').hide();
  $('#quoteValues').append(quoteString);
}

function getRandomCompany() {
  var companyLength = companyNames.length -1;
  var randomIndex = Math.round(Math.random() * companyLength - 1);
  if (randomIndex >  companyNames.length -1) {
    randomIndex = companyNames.length -1;
  }
  return companyNames[randomIndex];
}

function addQuotes() {
  var meta = InsuranceContract.deployed();

  var companyName;
  var companyLength = companyNames.length;

  companyName = getRandomCompany();
  setTimeout(function() {
    companyName = getRandomCompany();
    meta.submitQuote(account, web3.toHex(companyName), 600, 500000, {
      from: account1
    }).then(function() {
      setStatus("Transaction complete!");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
  }, 10000)

  companyName = getRandomCompany();
  console.log(companyName);
  setTimeout(function() {
    companyName = getRandomCompany();
    meta.submitQuote(account, web3.toHex(companyName), 750, 600000, {
      from: account1
    }).then(function() {
      setStatus("Transaction complete!");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
  }, 2000)


  console.log(companyName);
  setTimeout(function() {
    companyName = getRandomCompany();
    meta.submitQuote(account, web3.toHex(companyName), 925, 800000, {
      from: account1
    }).then(function() {
      setStatus("Transaction complete!");
      console.log("fired event");
    }).catch(function(e) {
      console.log(e);
      setStatus("Error requesting quote.");
    });
  }, 3000)

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

    listenForQuotes();

    queryForQuotes();

    $("#coverageDetailsBox").hide();
    $("#consentBox").hide();
  });

  $(".personalInfoTab").click(function(){
    $("#personalInfoBox").show();
    $("#coverageDetailsBox").hide();
    $("#consentBox").hide();
    $(".consentTab").children(".active").removeClass("active");
    $(".coverageDetailsTab").children(".active").removeClass("active");
  });

  $(".coverageDetailsTab").click(function(){
    $("#personalInfoBox").hide();
    $("#coverageDetailsBox").show();
    $("#consentBox").hide();
    $(".personalInfoTab").children(".active").removeClass("active");
    $(".consentTab").children(".active").removeClass("active");
  });
  
  $(".consentTab").click(function(){
    $("#personalInfoBox").hide();
    $("#coverageDetailsBox").hide();
    $("#consentBox").show();
    $(".personalInfoTab").children(".active").removeClass("active");
    $(".coverageDetailsTab").children(".active").removeClass("active");
  });

  $("#step2NextButton").click(function() {
    $(".consentTab").click();
  });

  $("#step1NextButton").click(function() {
    $(".coverageDetailsTab").click();
  });



  $('#coverageNeedsDropdown li a').on('click', function() {
    $('#coverageNeedsButton').text($(this).text());
  });

  $('#educationDropdown li a').on('click', function() {
    $('#educationButton').text($(this).text());
  });

  $('#livingExpensesDropdown li a').on('click', function() {
    $('#livingExpensedButton').text($(this).text());
  });

  $('#funeralCostDropdown li a').on('click', function() {
    $('#funeralCostButton').text($(this).text());
  });

}
