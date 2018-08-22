var Util = {};

Util.diagramValidator = function(diagramName) {

    if (diagramName == '') {
        return false;
    }

    if (diagramName == '_temp_') {
        return false;
    }

    var forbidden = ['/', '\\', '*', '?']; // Might be easier to just ensure alphanumeracy?

    var hasForbidden = forbidden.some(function(c) {
        return diagramName.indexOf(c) !== -1
    });
    return !hasForbidden;
};


//
// filter invalid characters
//
Util.filterInvalidCharacters = function(str) {
    var res = str.replace(/[<>:"/\|?*']/g, "");
    return res;
}
//
// filter whitespace
//
Util.filterWhiteSpaceCharacters = function(str) {
    var res = str.trim();
    return res;
}

//
// Sort objects that have a "name" property.
//
Util.sortByName = function(a, b) {
    var aName = a.name.toUpperCase();
    var bName = b.name.toUpperCase();
    return ((aName > bName) - (bName > aName));
};

//
// Add td elements to a table row
// @param table     The table to add to.
// @param data      An array of elements to add.
//
Util.addTableRow = function(table, data, tdCss) {

    var row = $('<tr>');

    var _tdCss = {}
    if (tdCss) {
        _tdCss = tdCss;
    }

    for (var i = 0; i < data.length; i++) {
        var td = $('<td>', {
            css: _tdCss
        });

        data[i].appendTo(td);
        td.appendTo(row);
    }

    row.appendTo(table);

};

//
// Returns local date and time from a UTC string representation
//
Util.getLocalDateTime = function(d) {
    if (d.indexOf('.') != -1) {
        d = d.split('.')[0];
    }
    var dateStr = d + " UTC";
    // Safari workaround
    var dateStr = dateStr.replace(/-/g, '/');

    var date = new Date(dateStr);

    return [date.toLocaleDateString(), date.toLocaleTimeString()];
};

//
// Util to get local browser date from a UTC string representation
//
Util.getLocalDate = function(d) {
    return Util.getLocalDateTime(d)[0];
};

//
// Util to get local browser date from a UTC string representation
//
Util.getLocalTime = function(d) {
    return Util.getLocalDateTime(d)[1];
};

//
// Util to convert date/time string to human readable form
// input ex: 20180522_164244
// output ex: December 22, 2018 10:55 PM
//
Util.convertDateTimeStringToHumanReadable = function(dateTimeStr) {
    var year = dateTimeStr.substring(0, 4);
    var month = dateTimeStr.substring(4, 6);
    var day = dateTimeStr.substring(6, 8);
    var hour = dateTimeStr.substring(9, 11);
    var min = dateTimeStr.substring(11, 13);

    var dayNum = parseInt(day, 10);
    var hourNum = parseInt(hour, 10);
    var minNum = parseInt(min, 10);

    if (isNaN(dayNum) || isNaN(hourNum) || isNaN(minNum)) {
        return "Invalid date in filename";
    }

    if (month == "01")
        month = "January";
    else if (month == "02")
        month = "February";
    else if (month == "03")
        month = "March";
    else if (month == "04")
        month = "April";
    else if (month == "05")
        month = "May";
    else if (month == "06")
        month = "June";
    else if (month == "07")
        month = "July";
    else if (month == "08")
        month = "August";
    else if (month == "09")
        month = "September";
    else if (month == "10")
        month = "October";
    else if (month == "11")
        month = "November";
    else if (month == "12")
        month = "December";
    var ampm = "AM";
    if (hourNum == 0) {
        hourNum = 12;
    }
    else if (hourNum == 12) {
        ampm = "PM";
    }
    else if (hourNum >= 13) {
        hourNum -= 12;
        ampm = "PM";
    }
    if (min < 10) {
        minNum = "0" + minNum;
    }

    var finalStr = month + " " + dayNum + ", " + year + " " + hourNum + ":" + minNum + " " + ampm;
    return finalStr;

};