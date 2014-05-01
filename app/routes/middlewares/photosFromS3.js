'use strict';

var gm = require('gm'),
    exif = require('exif').ExifImage,
    AWS = require('aws-sdk'),
    config = require('../../../config/config'),
    _ = require('underscore');

var batchSize, cache, photos, photoServicePath, photosByYear, photoYears, s3Bucket;

batchSize = 20;
cache = [];
photos = [];
photoServicePath = '/photos';
photosByYear = [];
photoYears = [];
s3Bucket = 'devphotoflow';


// Set AWS region
AWS.config.update({region: 'eu-west-1'});

var s3 = new AWS.S3();

var isPhoto = function (fileName) {
    var photoPattern = /\b.(jpg)\b$/;
    return photoPattern.test(fileName.toLowerCase());
};

var copyOriginals = function () {


    var paramsUploads = {
        Bucket: s3Bucket,
        EncodingType: 'url',
        Prefix: "uploads"
    };

    s3.listObjects(paramsUploads, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        }
        else {
            _.each(data.Contents, function (file) { //For each file...
                if (isPhoto(file.Key)) {
                    s3.getObject({Bucket: s3Bucket, Key: file.Key}, function (err, data) { //Get file contents
                        var fileNamePattern = /([^/]+$)/;
                        var fileName = fileNamePattern.exec(file.Key)[0];
                        console.log("Found file " + fileName);
                        var folder;
                        if (err) {
                            console.log("Error in getting object");
                            console.log(err, err.stack);
                        } else {
                            var dataBody = data.Body;
                            new exif({image: data.Body}, function (error, exifData) {  //Get exif data
                                if (error) {
                                    console.log("Error in exif read of file");
                                    console.log(error.message);
                                } else {
                                    var exifDateTime = exifData ? exifData.exif.DateTimeOriginal : "";
                                    var dateTime = new Date(exifDateTime.substr(0, 4), exifDateTime.substr(5, 2), exifDateTime.substr(8, 2), exifDateTime.substr(11, 2), exifDateTime.substr(14, 2), exifDateTime.substr(17, 2));

                                    var photo = {};
                                    if (!exifData.image.Orientation || exifData.image.Orientation === 1) {   //Portrait, or orientation information is missing
                                        photo.width = exifData.exif.ExifImageWidth;
                                        photo.height = exifData.exif.ExifImageHeight;
                                        photo.aspect = exifData.exif.ExifImageWidth / exifData.exif.ExifImageHeight;
                                    } else {
                                        photo.width = exifData.exif.ExifImageHeight;
                                        photo.height = exifData.exif.ExifImageWidth;
                                        photo.aspect = exifData.exif.ExifImageHeight / exifData.exif.ExifImageWidth;
                                    }

                                    photo.dateTime = dateTime;
                                    photo.year = dateTime.getFullYear();
                                    photo.month = dateTime.getMonth();
                                    photo.day = dateTime.getDate();
                                    folder = photo.year + "/" + photo.month + "/" + photo.day;
                                    photo.url = photoServicePath + '/1200/' + folder + "/" + fileName;

                                    photos.push(photo);

                                    // Put original in "Originals" folder
                                    console.log("Putting original file " + fileName + " in Originals folder");
                                    var paramsOriginal = {
                                        Bucket: s3Bucket,
                                        Key: "originals/" + folder + "/" + fileName,
                                        Metadata: { "aspect": photo.aspect.toString(),
                                            "datetime": photo.dateTime.toString()
                                        },
                                        Body: dataBody
                                    };

                                    s3.putObject(paramsOriginal, function (err) {
                                        if (err) {
                                            console.log("error putting original " + fileName);
                                            console.log(err, err.stack);
                                        }
                                    });

                                    // Put resized image in "1200" folder
                                    console.log("Resizing image " + fileName);
                                    gm(dataBody)
                                        .resize(1200)
                                        .autoOrient()
                                        .toBuffer(function (err, resizedData) {
                                            if (err) {
                                                console.log(err, err.stack);
                                            }

                                            console.log("Putting resized file " + fileName + " in 1200 folder");
                                            var paramsResized = {
                                                Bucket: s3Bucket,
                                                Key: "1200/" + folder + "/" + fileName,
                                                Metadata: { "aspect": photo.aspect.toString(),
                                                    "datetime": photo.dateTime.toString()
                                                },
                                                Body: resizedData
                                            };

                                            s3.putObject(paramsResized, function (err) {
                                                if (err) {
                                                    console.log("error putting resized " + fileName);
                                                    console.log(err, err.stack);
                                                }
                                            });
                                        });
                                }
                            });
                        }
                    });
                }
            });
        }
    });

};

//Read all downsized files and get metadata for each file

var readAllPhotos = function () {

    var paramsList = {
        Bucket: s3Bucket, // required
        EncodingType: 'url',
        Prefix: "1200"
    };

    s3.listObjects(paramsList, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        }
        else {
            _.each(data.Contents, function (file) {
                var paramsHead = {
                    Bucket: s3Bucket,
                    Key: file.Key
                };

                var photoKey = file.Key;
                s3.headObject(paramsHead, function (err, head) {
                    if (err) {
                        console.log(err, err.stack);
                    }
                    else {
                        var dateTime = new Date(head.Metadata.datetime);
                        var photo = {   url: photoServicePath + '/' + photoKey,
                            dateTime: dateTime,
                            aspect: parseFloat(head.Metadata.aspect, 10),
                            year: dateTime.getFullYear(),
                            month: dateTime.getMonth(),
                            day: dateTime.getDate()
                        };
                        photos.push(photo);
                    }
                });
            });
        }
    });
};

var getPhoto = function (req, res) {

    var key = req.path.substr(photoServicePath.length + 1);
    if (cache[key]) {
        // console.log("From cache...");
        res.contentType('image/jpg');
        res.end(cache[key], 'binary');
    } else {
        //console.log("From filesystem...");
        s3.getObject({Bucket: s3Bucket, Key: key}, function (err, data) {
            console.log("File " + data.ETag);
            if (config.caching) {
                cache[key] = data.Body;
            }
            res.contentType('image/jpg');
            res.end(data.Body, 'binary');
        });
    }
};
function getListOfPhotos(req, res) {
    var batch = req.query.batch;
    if (batchSize > photos.length && batch === 1) {
        res.send(JSON.stringify(photos));
    } else {
        res.send(JSON.stringify(photos.slice(batchSize * batch, batchSize * batch + batchSize)));
    }
}

function getPhotosByYear(req, res) {
    res.send(JSON.stringify(photoYears));
}

readAllPhotos();
//copyOriginals();

exports.getPhotosByYear = getPhotosByYear;
exports.getPhoto = getPhoto;
exports.getListOfPhotos = getListOfPhotos;
exports.copyOriginal = copyOriginals;
exports.readAllPhotos = readAllPhotos;


exports.photoServicePath = photoServicePath;
