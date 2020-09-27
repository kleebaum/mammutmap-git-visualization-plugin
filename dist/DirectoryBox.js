"use strict";
exports.__esModule = true;
exports.DirectoryBox = void 0;
var util = require("./util");
var FileBox_1 = require("./FileBox");
var DirectoryBox = /** @class */ (function () {
    function DirectoryBox(directoryPath, id) {
        this.boxes = [];
        this.path = directoryPath;
        this.id = id;
    }
    DirectoryBox.prototype.getPath = function () {
        return this.path;
    };
    DirectoryBox.prototype.render = function () {
        var _this = this;
        util.logInfo('Box::render ' + this.path);
        util.readdirSync(this.path).forEach(function (file) {
            var fileName = file.name;
            var filePath = _this.path + '/' + fileName;
            if (file.isDirectory()) {
                util.logInfo('Box::render directory ' + filePath);
                _this.renderDirectory(fileName);
            }
            else if (file.isFile()) {
                util.logInfo('Box::render file ' + filePath);
                _this.boxes.push(_this.createFileBox(fileName));
            }
            else {
                util.logError('Box::render ' + filePath + ' is neither file nor directory.');
            }
        });
        this.boxes.forEach(function (box) {
            box.render(49, 2 * 80 / _this.boxes.length);
        });
    };
    DirectoryBox.prototype.renderDirectory = function (name) {
        util.addContent('<div style="display:inline-block;border:dotted;border-color:skyblue;">' + name + '</div>');
    };
    DirectoryBox.prototype.createFileBox = function (name) {
        var elementId = util.generateElementId();
        util.addContent('<div id="' + elementId + '" style="display:inline-block;">loading...' + name + '</div>');
        return new FileBox_1.FileBox(null, name, elementId); // TODO: use strict in tsconfig.json
    };
    return DirectoryBox;
}());
exports.DirectoryBox = DirectoryBox;
//# sourceMappingURL=DirectoryBox.js.map