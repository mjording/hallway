module.exports = {
    endPoint : "https://alpha.app.net/oauth/access_token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://alpha.app.net/oauth/authenticate?scope=stream,email&response_type=code"
}