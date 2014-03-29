'use strict';

angular.module('photoflow.system').controller('mainController', ['$scope', '$http', 'linearPartitionService', function ($scope, $http, lp) {

    var getImageMap = function () {
        $http.get('/rest/map')
            .then(function (result) {
                $scope.map = result.data;
            });
    };

    $scope.photos = [];
    $scope.map = [];
    $scope.lp = lp;

    getImageMap();

}]);