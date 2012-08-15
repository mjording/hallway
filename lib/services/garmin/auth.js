module.exports = {
  handler : function (cbURI, apiKeys, done, req, res) {
    console.error(cbURI);
    res.send("hello world, <a href='/static/garmin/test.html'>test</a>");
  }
}