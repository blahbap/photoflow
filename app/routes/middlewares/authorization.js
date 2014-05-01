'use strict';

/**
 * Generic require login routing middleware
 */
exports.requiresLogin = function(req, res, next) {
    var users = require('../../controllers/users');


    if (!req.isAuthenticated()) {
        //return res.send(401, 'User is not authorized');
        users.googlesignin(req, res);
    } else {
        next();
    }
};