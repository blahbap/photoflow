'use strict';

var photos = require('./middlewares/photosFromS3');

module.exports = function(app) {

    app.get('/rest/photos', function (req, res) {
        photos.getListOfPhotos(req, res);
    });

    app.get('/rest/map', function (req, res) {
        photos.getPhotosByYear(req, res);
    });

    app.get(photos.photoServicePath + '/*', function (req, res) {
        photos.getPhoto(req, res);
    });

};
