//@ts-check

var express = require("express");
var router = express.Router();
var formurlencoded = require("form-urlencoded");
var request = require("request-promise-native");
var redis;
var raidbotConfig;// = new (require("raidbot-config").RaidBotConfig); //FIXME: only for dev

const discordApi = {
  authUrl: "https://discordapp.com/api/oauth2/authorize",
  tokenUrl: "https://discordapp.com/api/oauth2/token",
  identifyUrl: "https://discordapp.com/api/v6/users/@me",
  guildsUrl: "https://discordapp.com/api/v6/users/@me/guilds"
};

router.get("/user", authMiddleware, (req, res, next) => {
  res.send(req.session.user);
});

router.get("/discord", (req, res, next) => {
  let url =
    discordApi.authUrl +
    "?" +
    formurlencoded({
      client_id: raidbotConfig.clientID,
      scope: "identify guilds",
      response_type: "code",
      redirect_uri: raidbotConfig.hostname + "auth/discord/callback/"
    });

  res.redirect(url);
});

router.get("/discord/callback", (req, res, next) => {
  if (req.query.code) {
    let code = req.query.code;

    request
      .post(discordApi.tokenUrl, {
        form: {
          client_id: raidbotConfig.clientID,
          client_secret: raidbotConfig.clientSecret,
          redirect_uri: raidbotConfig.hostname + "auth/discord/callback/",
          grant_type: "authorization_code",
          code: code
        }
      })
      .then(json => JSON.parse(json))
      .then(obj => obj.access_token)
      .catch(() => {return new Error("JSON Error");})
      .then(token => {
        let user = {
            name: undefined,
            id: undefined,
            isMember: false,
            isAdmin: false
          };
        return Promise.all([
            request
              .get(discordApi.identifyUrl)
              .auth(null, null, true, token)
              .then(response => JSON.parse(response))
              .then(discorduser => {
                user.id = discorduser.id;
                user.name = discorduser.username;
              }),
            request
              .get(discordApi.guildsUrl)
              .auth(null, null, true, token)
              .then(response => JSON.parse(response))
              .then(guilds => {
                guilds.forEach(function(guild) {
                  if (guild.id === raidbotConfig.guildID) {
                    user.isMember = true;
                    if ((guild.permissions & 8) > 0) {
                      //0x00000008 = ADMINISTRATOR flag
                      user.isAdmin = true;
                    }
                  }
                }, this);
              })
          ]).then(() => user);
      })
      .then(user => {
          if(user.isMember)
            req.session.user = user;
          else
            req.flash("danger", "You are not a server member!")
      })
      .then(() => {
          res.redirect("/");
      })
      ;
  } else {
    res.redirect("/");
  }
});

router.get("/logout", (req, res, next) => {
    req.session.destroy();
    res.redirect("/");
});

function authMiddleware(req, res, next) {
  if (req.session.user) {
    next();
  }
  else {
    req.flash("danger", "You are not logged in!");
    res.redirect("/");
  }
}

router.authMiddleware = authMiddleware;
module.exports = (db, raidbotconfig) => {
  raidbotConfig = raidbotconfig;
  redis = db;
  return router;
};
