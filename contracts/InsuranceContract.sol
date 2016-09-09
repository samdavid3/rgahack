contract InsuranceContract {

  function InsuranceContract() {
  
  }

  struct Quote {
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
        mapping(address => Quote) quote;
  }
  
  mapping(address => InsuranceRequest) public requests;
  
  event InsuranceRequested(address requestor, uint age, bytes32 gender, uint zip, bytes32 height, uint weight, bool tobaccoUse, uint lengthOfProtection, bool dmvRecords, bool medicalHistory, uint coverageRequested);

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
  
}
  