//@ts-check
var express = require("express");
var router = express.Router();
var fs = require("fs");
var formidable = require("formidable");
var mv = require("mv");
var ffprobe = require("ffprobe");
var ffprobeStatic = require("ffprobe-static");

var db; // = new (require("raidbot-redis-lib")).RaidBotDB("test"); // FIXME: Only for dev
var raidbotConfig; //= new (require("raidbot-config").RaidBotConfig); //FIXME: only for dev

router.get("/categories", function(req, res, next) {
  db
    .getCategories()
    .then(categories =>
      categories.sort((a, b) => {
        if (a.membercount > b.membercount) return -1;

        if (a.membercount < b.membercount) return 1;

        return 0;
      })
    )
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

router.delete("/categories/:cat_id/:sound_id/", (req, res, next) => {
  const cat_id = req.params.cat_id;
  const sound_id = req.params.cat_id;

  if (!isNaN(cat_id) && !isNaN(sound_id)) {
    db.removeSoundFromCategory(cat_id, sound_id).then(() => {
      res.sendStatus(200);
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

router.get("/sounds/count", (req, res, next) => {
  db
    .getSoundsNumber()
    .then(number => {
      res.send("" + number);
    })
    .catch(() => {
      res.sendStatus(500);
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
  form.onPart = part => {
    if (!part.filename) form.handlePart(part);
  };
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

  db
    .getSoundById(sound_id)
    .then(sound =>
      Promise.all([
        db.deleteSound(sound_id),
        new Promise((resolve, reject) => {
          fs.unlink(raidbotConfig.soundpath + sound.file, err => {
            if (err) reject(err);
            else resolve();
          });
        })
      ])
    )
    .then(() => {
      res.sendStatus(200);
    })
    .catch(() => {
      res.sendStatus(500);
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

router.post("/sounds/:sound_id/categories", (req, res, next) => {
  const sound_id = req.params.sound_id;

  const form = new formidable.IncomingForm();
  form.onPart = part => {
    if (!part.filename) form.handlePart(part);
  };

  form.parse(req, (err, fields) => {
    if (!fields.categories) {
      res.sendStatus(400);
      return;
    }

    const categories = {
      strings: (function() {
        try {
          return JSON.parse(fields.categories);
        } catch (err) {
          return [];
        }
      })(),
      map: {},
      before: [],
      after: []
    };

    Promise.all([
      db.getCategories().then(categoryList => {
        categoryList.forEach(function(category) {
          categories.map[category.name.toLowerCase()] = category;
        }, this);
      }),
      db.getCategoriesForSound(sound_id).then(categoryList => {
        categories.before = categoryList.map(category => category.id);
      })
    ])
      .then(() => {
        const promises = [];
        categories.strings.forEach(function(categoryString) {
          if (categories.map[categoryString.toLowerCase()]) {
            const cat_id = categories.map[categoryString.toLowerCase()].id;
            categories.after.push(cat_id);

            if (!categories.before.includes(cat_id)) {
              promises.push(db.addSoundToCategory(sound_id, cat_id));
            }
          } else {
            promises.push(
              db.createCategory(categoryString).then(category => {
                db.addSoundToCategory(sound_id, category.id);
                //No need to add this category to categories.after, since this category is new, thus the sound could not have been removed from it
              })
            );
          }
        }, this);
        return Promise.all(promises);
      })
      .then(() => {
        const promises = [];
        categories.before.forEach(function(categoryID) {
          if (!categories.after.includes(categoryID)) {
            promises.push(db.removeSoundFromCategory(categoryID, sound_id));
          }
        }, this);

        return Promise.all(promises);
      })
      .then(() => {
        res.sendStatus(200);
      });
  });
});

router.post("/joinsound/:uid/", (req, res, next) => {
  const uid = req.params.uid;
  if (!(req.session.user.id == uid || req.session.user.isAdmin)) {
    res.sendStatus(401);
    return;
  }

  const form = new formidable.IncomingForm();

  //Do not care about files
  form.onPart = part => {
    if (!part.filename) form.handlePart(part);
  };

  form.parse(req, (err, fields, files) => {
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
    if (!part.filename || part.name == "sound") {
      form.handlePart(part);
    }
  };
  form.parse(req, (err, fields, files) => {
    const name = fields.name;
    const categories = fields.categories;
    const file = files.sound;

    if (file && name && name != "" && file != undefined) {
      let newpath = raidbotConfig.soundpath + file.hash;

      fs.access(newpath, fs.constants.F_OK, err => {
        if (err) {
          mv(file.path, newpath, err => {
            ffprobe(newpath, {path:ffprobeStatic.path}, (err, obj) => {
              if (err) {
                console.log(err);
                return err;
              }

              let duration = Math.round(obj.streams[0].duration);

              db
                .createSound(name, duration, req.session.user.id, file.hash)
                .then(sound => {
                  return sound.id;
                })
                .then(sid => {
                  if (!fields.categories) return Promise.resolve();
                  const categories = {
                    strings: JSON.parse(fields.categories),
                    map: {}
                  };

                  return db
                    .getCategories()
                    .then(categoryList => {
                      categoryList.forEach(function(category) {
                        categories.map[category.name.toLowerCase()] = category;
                      }, this);
                    })
                    .then(() => {
                      const promises = [];
                      categories.strings.forEach(function(categoryString) {
                        if (categories.map[categoryString.toLowerCase()]) {
                          const cat_id =
                            categories.map[categoryString.toLowerCase()].id;

                          promises.push(db.addSoundToCategory(sid, cat_id));
                        } else {
                          promises.push(
                            db.createCategory(categoryString).then(category => {
                              db.addSoundToCategory(sid, category.id);
                            })
                          );
                        }
                      }, this);
                      return Promise.all(promises);
                    });
                })
                .then(() => {
                  req.flash("success", "Sound uploaded successfully!");
                  res.sendStatus(200);
                })
                .catch(err => {
                  req.flash("danger", "Something went wrong...");
                  res.sendStatus(500);
                });
            });
          });
        } else {
          req.flash("danger", "Sound already exists!");
          res.status(409);
          res.send("Already exists!");
        }
      });
    } else {
      req.flash(
        "danger",
        "Please fill in <strong>Name</strong> and <strong>Sound</strong>"
      );
      res.sendStatus(400);
    }
  });
});

router.post("/play/:sound_id", (req, res, next) => {
  let user = req.session.user;
  let sound_id = parseInt(req.params.sound_id);

  if (isNaN(sound_id)) {
    res.sendStatus(400);
    return;
  }

  db.send("playSound", { uid: user.id, sid: sound_id });
  res.sendStatus(200);
});

module.exports = (raidbotdb, raidbotconfig) => {
  raidbotConfig = raidbotconfig;
  db = raidbotdb;
  return router;
};
