var express = require('express');


module.exports = (viewname) => {
    const router = express.Router();

    router.get('/', function(req, res, next) {
        res.render(viewname);
      });
    
      return router;
};
