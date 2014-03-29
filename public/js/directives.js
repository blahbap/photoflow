'use strict';

angular.module('photoflow.system').directive('imageflow', ['$window','$document', '$http', function($window, $document, $http){
    return {
        restrict:'E',
        template:

            '<div ng-repeat="photo in photos" class="photo repeated-item" style="width: {{photo.optWidth}}px; height: {{photo.optHeight}}px; background-image: url({{photo.url}});"></div>'
        ,

        replace: false,
        link: function(scope, element) {
            var w = angular.element($window),
                calculationInProgress = false,
                batch = 0, //Batch pf photos to load
                lastScrollTop = 0,
                idealHeight = parseInt($window.innerHeight / 2);

            var getImages = function(batch) {
                $http.get('/rest/photos?batch=' + batch + '&idealHeight=' + idealHeight)
                    .then(function(result) {
                        scope.photos = scope.photos.concat(result.data);
                    });
            };

            var getScrollBarWidth = function() {
                document.body.style.overflow = 'hidden';
                var width = document.body.clientWidth;
                document.body.style.overflow = 'scroll';
                width -= document.body.clientWidth;
                if(!width) width = document.body.offsetWidth - document.body.clientWidth;
                document.body.style.overflow = '';
                return width;
            };

            var calculateImagesWidth = function() {

                var rows = 0,
                    summedWidth = 0,
                    weights = 0,
                    windowWidth = 0,
                    partition,
                    scrollbarWidth = 15,
                    marginWidth = 2;


                var arrayWithmaxImagesInARow = _.max(partition, function(row) {
                    return row.length;
                });

                scrollbarWidth = getScrollBarWidth();

                windowWidth = $window.innerWidth - scrollbarWidth;
                summedWidth = scope.photos.reduce((function(sum, p) {
                    return sum += p.aspect * idealHeight;
                }), 0);

                rows = Math.round(summedWidth / windowWidth);
                weights = scope.photos.map(function(p) {
                    return parseInt(p.aspect * 100);
                });

                partition = scope.lp(weights, rows);

                var row_buffer = [],
                    index = 0;

                angular.forEach(partition, function(row, idx) {
                    var summed_ratios,
                        width,
                        height;
                    row_buffer = [];
                    angular.forEach(row, function() {
                        return row_buffer.push(scope.photos[index++]);
                    });
                    summed_ratios = row_buffer.reduce((function(sum, p) {
                        return sum += p.aspect;
                    }), 0);
                    return angular.forEach(row_buffer, function(photo) {
                        width = parseInt((windowWidth -  ((row_buffer.length + 6) * marginWidth )) / summed_ratios * photo.aspect);
                        height = parseInt(windowWidth / summed_ratios);
                        photo.optWidth = width;
                        photo.optHeight = height;
                        photo.rowno = idx;
                    });
                });

                calculationInProgress = false;

            };

            //Calculate image width when new photos are available in the array
            scope.$watch('photos', function(newValue, oldValue) {
                if (newValue.length > 0) {
                    //Get width of container for photos
                    calculateImagesWidth();
                }
            });

            // Bind event handler to resize event
            w.bind('resize', function(){
                if (!calculationInProgress) {
                    idealHeight = parseInt($window.innerHeight / 2);
                    calculateImagesWidth();
                    scope.$apply();
                }
            })

            //Load new photos when reaching bottom of screen
            w.bind("scroll", function() {
                var scrollTop = $(window).scrollTop() ;
                if(scrollTop > lastScrollTop && ( scrollTop + $(window).height() > $(document).height() - 100)) {
                    scope.$apply();
                    getImages(batch++)
                };
                lastScrollTop = scrollTop;
            });

            getImages(batch);
        }
    }
}]);