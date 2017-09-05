//@ts-check
var express = require("express");
var router = express.Router();
var mediainfo = require("mediainfo-parser");
var fs = require("fs");
var formidable = require("formidable");
var mv = require("mv");

var db;

router.get("/categories", function(req, res, next) {
  db
    .getCategories()
    .then(categories => {
      return JSON.stringify(categories);
    })
    .then(json => {
      res.send(json);
    });
});

router.get("/categories/:cat_id/sounds", (req, res, next) => {
  const cat_id = req.params.cat_id;

  if (!isNaN(cat_id)) {
    db
      .getSoundsInCategory(cat_id)
      .then(sounds => {
        sounds.forEach(snd => {
          delete snd.file;
        }); //irrelevant for web-interface
        return JSON.stringify(sounds);
      })
      .then(sounds => {
        res.send(sounds);
      });
  } else res.sendStatus(404);
});

router.delete("/categories/:cat_id/", (req, res, next) => {
  const cat_id = req.params.cat_id;

  if (!isNaN(cat_id)) {
    db.deleteCategory(cat_id).then(() => {
      res.sendStatus(200);
    });
  } else res.sendStatus(404);
});

router.get("/sounds/", (req, res, next) => {
  db
    .getSounds()
    .then(sounds => {
      sounds.forEach(snd => {
        delete snd.file;
      }); //irrelevant for web-interface
      return JSON.stringify(sounds);
    })
    .then(sounds => {
      res.send(sounds);
    });
});

router.get("/sounds/:sound_id/", (req, res, next) => {
  const sound_id = req.params.sound_id;

  db
    .getSoundById(sound_id)
    .then(snd => {
      delete snd.file;
      return JSON.stringify(snd);
    })
    .then(snd => {
      res.send(snd);
    });
});

router.post("/sounds/:sound_id/", (req, res, next) => {
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    const sound_id = req.params.sound_id;
    const name = fields.name;

    db
      .renameSound(sound_id, name)
      .then(() => {
        res.sendStatus(200);
      })
      .catch(() => {
        res.sendStatus(500);
      });
  });
});

router.delete("/sounds/:sound_id", (req, res, next) => {
  const sound_id = req.params.sound_id;

  db.deleteSound(sound_id).then(() => {
    res.sendStatus(200);
  });
});

router.get("/sounds/:sound_id/categories", (req, res, next) => {
  const sound_id = req.params.sound_id;

  db
    .getCategoriesForSound(sound_id)
    .then(categories => {
      return JSON.stringify(categories);
    })
    .then(categories => {
      res.send(categories);
    });
});

router.post("/joinsound/:uid/", (req, res, next) => {
  //TODO: Implement Auth

  const form = new formidable.IncomingForm();

  //Do not care about files
  form.onPart = part => {
    if (!part.filename) form.handlePart(part);
  };

  form.parse(req, (err, fields, files) => {
    const uid = req.params.uid;
    const sid = Number.parseInt(fields.sid);

    debugger;

    db
      .setJoinsound(uid, sid)
      .then(() => {
        res.sendStatus(200);
      })
      .catch(() => {
        res.sendStatus(404);
      });
  });
});

router.get("/joinsound/:uid/", (req, res, next) => {
  const uid = req.params.uid;

  db
    .getJoinsound(uid)
    .then(sound => JSON.stringify(sound))
    .then(sound => {
      res.send(sound);
    })
    .catch(() => {
      res.sendStatus(500);
    });
});

router.get("/search/sounds/:searchstring", (req, res, next) => {
  const searchstring = req.params.searchstring;

  db
    .searchSounds(searchstring)
    .then(sounds => {
      return JSON.stringify(sounds);
    })
    .then(sounds => {
      res.send(sounds);
    });
});

router.put("/sounds/new", (req, res, next) => {
  const form = new formidable.IncomingForm();
  form.hash = "md5";
  form.keepExtensions = false;
  form.maxFieldsSize = 10 * 1024 * 1024;
  form.onPart = part => {
    console.log(JSON.stringify(part));
    if (!part.filename || part.name == "sound") {
      form.handlePart(part);
    }
  };
  form.parse(req, (err, fields, files) => {
    const name = fields.name;
    const categories = fields.categories;
    const file = files.sound;

    if (file && name) {
      let newpath = "/mnt/RaidBot/sounds/" + file.hash; //TODO: req.app.get("sounddir")

      fs.access(newpath, fs.constants.F_OK, err => {
        if (err) {
          mv(file.path, newpath, err => {
            debugger;
            mediainfo.exec(newpath, (err, obj) => {
              debugger;
              let duration = Math.ceil(obj.file.track[0].duration / 1000);

              db
                .createSound(name, duration, file.hash)
                .then(sound => {
                  return sound.id;
                })
                .then(sid => {
                  let cat_ids =
                    categories != undefined ? categories.split(",") : [];
                  let promises = [];
                  cat_ids.forEach(cat => {
                    if (!isNaN(cat)) {
                      promises.push(db.addSoundToCategory(sid, cat));
                    }
                  });
                  return Promise.all(promises);
                })
                .then(() => {
                  res.sendStatus(200);
                })
                .catch(err => {
                  res.status(500);
                  res.send(JSON.stringify);
                });
              debugger;
            });
          });
        } else {
          res.status(409);
          res.send("Already exists!");
        }
      });
    }
  });
});

module.exports = raidbotdb => {
  db = raidbotdb;
  return router;
};
