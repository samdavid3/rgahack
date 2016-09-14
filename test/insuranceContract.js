contract('MetaCoin', function(accounts) {
  it("should do some stuff", function() {
    var meta = InsuranceContract.deployed();

    return meta.getNumberOfQuotes.call(accounts[0], 'company', 100, 10000).then(function(balance) {
      assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    });
  });
});