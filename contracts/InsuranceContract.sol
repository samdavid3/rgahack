contract InsuranceContract {

  function InsuranceContract() {
  
  }

  struct Quote {
    address quoter;
    bytes32 companyName;
    uint monthlyPremium;
    uint coverageOffered;
  }
  
  
  struct InsuranceRequest {
        uint age;
        bytes32 gender;
        uint zip;
        bytes32 height;
        uint weight;
        bool tobaccoUse;
        uint lengthOfProtection;
        bool dmvRecords;
        bool medicalHistory;
        uint coverageRequested;
        Quote[] quotes;
  }
  
  mapping(address => InsuranceRequest) public requests;
  
  event InsuranceRequested(address requestor, uint age, bytes32 gender, uint zip, bytes32 height, uint weight, bool tobaccoUse, uint lengthOfProtection, bool dmvRecords, bool medicalHistory, uint coverageRequested);
  event InsuranceQuoted(address requestor, bytes32 companyName, uint monthlyPremium, uint coverageOffered);

  function submitRequest(
    uint age, bytes32 gender, uint zip, bytes32 height, uint weight, bool tobaccoUse, uint lengthOfProtection, bool dmvRecords, bool medicalHistory, uint coverageRequested) {
    
    requests[msg.sender].age = age;
    requests[msg.sender].gender = gender;
    requests[msg.sender].zip = zip;
    requests[msg.sender].height = height;
    requests[msg.sender].weight = weight;
    requests[msg.sender].tobaccoUse = tobaccoUse;
    requests[msg.sender].lengthOfProtection = lengthOfProtection;
    requests[msg.sender].dmvRecords = dmvRecords;
    requests[msg.sender].medicalHistory = medicalHistory;
    requests[msg.sender].coverageRequested = coverageRequested;
    
    InsuranceRequested(msg.sender, age, gender, zip, height, weight, tobaccoUse, lengthOfProtection, dmvRecords, medicalHistory, coverageRequested);
  }
  
  function submitQuote(address requestor, bytes32 companyName, uint monthlyPremium, uint coverageOffered) {
    requests[requestor].quotes.push(Quote({
      quoter: msg.sender,
      companyName: companyName,
      monthlyPremium: monthlyPremium,
      coverageOffered: coverageOffered
    }));
  
    InsuranceQuoted(msg.sender, companyName, monthlyPremium, coverageOffered);
  }
  
  function getNumberOfQuotes(address requestor) constant returns (uint count) {
    count = requests[requestor].quotes.length;
  }

  function getQuotes(address requestor, uint index) constant returns (address, bytes32, uint, uint) {
    Quote quote = requests[requestor].quotes[index];
    return (quote.quoter, quote.companyName, quote.monthlyPremium, quote.coverageOffered);
  }

}
  