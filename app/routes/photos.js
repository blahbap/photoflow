'use strict';

var photos = require('../controllers/photos'),
    gm = require('gm'),
    walker = require('node-walker'),  //Traverse directory
    imgSize = require('image-size'),  //Get image size fast
    exif = require('exif').ExifImage,
    config = require('../../config/config'),
    _ = require('underscore');

module.exports = function (app) {

    var batchSize = 20,                   //Number of photos to send in each request
        cache = [],
        photos = [],
        photoServicePath = '/photos';

    var photosByYear = [],
        photoYears = [];


    var isPhoto = function (fileName) {
        var photoPattern = /\b.(jpg|bmp|jpeg|gif|png|tif)\b$/;
        return photoPattern.test(fileName.toLowerCase());
    };

    function readAllPhotos() {
        walker(config.photoDirectory, function (errorObject, fullPathToFile, fnNext) {
            // an error occurred
            if (errorObject) throw errorObject;

            if (fullPathToFile === null) {
                console.log("All photos read from directory " + config.photoDirectory);

                // Group photos
                photosByYear = _.groupBy(photos, "year")

                photoYears = _.chain(photos)
                    .map(function (photo) {
                        return photo.year;
                    })
                    .uniq()
                    .value();

                return;
            }

            if (isPhoto(fullPathToFile)) {   // A photo
                var folder = fullPathToFile.split("/");

                imgSize(fullPathToFile, function (err, dim) {
                    try {
                        new exif({image: fullPathToFile}, function (error, exifData) {
                            if (error) {
                                console.log("Error in exif read of file " + fullPathToFile);
                                console.log(error.message);
                            } else {
                                console.log("Processing exif in File: " + fullPathToFile);
                                // console.log("EXIF: " + exifData);
                                var fileName = fullPathToFile.substr(config.photoDirectory.length + 1);
                                // console.log('Reading file ' + fileName );
                                var exifDateTime = exifData ? exifData.exif.DateTimeOriginal : "";
                                var dateTime = new Date(exifDateTime.substr(0, 4), exifDateTime.substr(5, 2), exifDateTime.substr(8, 2), exifDateTime.substr(11, 2), exifDateTime.substr(14, 2), exifDateTime.substr(17, 2));
                                var photo = {  url: photoServicePath + '/' + fileName,
                                    dateTime: dateTime,
                                    year: dateTime.getFullYear(),
                                    month: dateTime.getMonth(),
                                    day: dateTime.getDate()
                                };
                                // console.log("File: " + fullPathToFile + " Width:" +  exifData.exif.ExifImageWidth + " - " + dim.width + " Height:" +
                                //                exifData.exif.ExifImageHeight + " " + dim.height + " Orientation: " + exifData.image.Orientation + " Date: " + dateTime);
                                if (!exifData.image.Orientation || exifData.image.Orientation === 1) {   //Portrait, or orientation information is missing
                                    photo.width = exifData.exif.ExifImageWidth;
                                    photo.height = exifData.exif.ExifImageHeight;
                                    photo.aspect = exifData.exif.ExifImageWidth / exifData.exif.ExifImageHeight;
                                } else {
                                    photo.width = exifData.exif.ExifImageHeight;
                                    photo.height = exifData.exif.ExifImageWidth;
                                    photo.aspect = exifData.exif.ExifImageHeight / exifData.exif.ExifImageWidth;
                                }
                                ;

                                photos.push(photo);
                            }
                            ;
                        });
                    } catch (exifError) {
                        console.log("EXIF exception!!!")
                        console.log(exifError);
                    }
                });
            }
            ;
            if (fnNext) {
                fnNext();
            } else {
                return;
            }
        })
    };


    app.get('/rest/photos', function (req, res) {
        var batch = req.query.batch,
            idealHeight = req.query.idealHeight;

        if (batchSize > photos.length && batch == 1) {
            res.send(JSON.stringify(photos));
        } else {
            res.send(JSON.stringify(photos.slice(batchSize * batch, batchSize * batch + batchSize)));
        }
        ;
    });

    app.get('/rest/map', function (req, res) {
        res.send(JSON.stringify(photoYears));
    });

    app.get(photoServicePath + '/*', function (req, res) {

        var fileName = req.path.substr(photoServicePath.length + 1);

        fileName = config.photoDirectory + '/' + fileName;
        if (isPhoto(fileName)) {
            if (cache[fileName]) {
                // console.log("From cache...");
                res.contentType('image/jpg');
                res.end(cache[fileName], 'binary');
            } else {
                // console.log("From filesystem...");
                gm(fileName)
                    .resize(1200)
                    .autoOrient()
                    .toBuffer(function (err, resizedData) {
                        if (err) throw err;
                        cache[fileName] = resizedData;
                        res.contentType('image/jpg');
                        res.end(resizedData, 'binary');
                    })

            }
        } else {
            res.end();
        }
    });

    readAllPhotos();


};