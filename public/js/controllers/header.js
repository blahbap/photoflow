'use strict';

angular.module('photoflow.system').controller('HeaderController', ['$scope', 'Global', function ($scope, Global) {
    $scope.global = Global;

    $scope.isCollapsed = false;
}]);