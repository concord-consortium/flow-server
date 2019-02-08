//
// Block palette
//
var ProgramEditorBlockPalette = function(options) {

    var container = options.container;
    var parentcontainer = menuandcontentdiv;
    var programEditorPanel = options.programEditorPanel;

    //
    // create a menu section
    //
    var createSection = function(name, content, collapsedbydefault) {

        var div = $('<div>', {class: 'menu-section'});
        var header = $('<div>', {class: 'menu-header-editor'} );
        var title = $('<div>', {class: 'menu-title menu-title-editor noSelect'} ).text(name);
        var chevron = $('<div>', {class: 'diagram-menu-chevron noSelect'} );
        var img = $('<img>');
        img.attr('src', "flow-server/static/flow/images/icon-arrow-white.png");
        img.appendTo(chevron);

        if (name == 'Input') {
            header.addClass('concordblue');
        } else if (name == 'Logic') {
            header.addClass('concordgreen');
        } else if (name == 'Outputs') {
            header.addClass('concordorange');
        } else {
            header.addClass('concordlightblue');
        }

        header.click( function(e) {
            if (content.is(":visible")) {
                img.attr("src","flow-server/static/flow/images/icon-arrow-right-white.png");
                content.hide();
            } else {
                img.attr("src","flow-server/static/flow/images/icon-arrow-white.png");
                content.show();
            }
        });
        div.append(header);
        header.append(title);
        header.append(chevron);
        div.append(content);

        if (collapsedbydefault) {
            img.attr("src","flow-server/static/flow/images/icon-arrow-right-white.png");
            content.hide();
        }

        return div;
    }

    //
    // create the sensor menu section main button
    //
    var createBtn = function(name, type, tooltip) {

        var menuentry = $('<div>', { class: 'diagram-menu-entry container-light-gray', title: tooltip } );
        var btn;
        btn = $('<span>', { class: '' } );

        // Icon
        var menuIcon = $('<img class="menu-icon">');
        const STATIC_IMAGES_DIR = "flow-server/static/flow/images/icon-";
        // Lookup icon from types defined in block-definitions
        menuIcon.attr('src', STATIC_IMAGES_DIR + ICON_TYPE_MAP[type]);

        menuIcon.attr("height","20");
        menuIcon.appendTo(menuentry);

        btn.text(name);
        menuentry.click( function() {
            if (type=='temperature' || type=='humidity' || type=='CO2' || type=='O2'
                || type=='light' || type=='soilmoisture' || type=='particulates') {
                programEditorPanel.addDeviceBlock(type);
            } else if (type=='relay') {
                programEditorPanel.addRelayBlock("relay");
            } else if (type == "plot") {
                programEditorPanel.addPlotBlock("plot");
            } else if (type == "data storage") {
                programEditorPanel.addDataStorageBlock("data storage");
            } else if (type=='number') {
                programEditorPanel.addNumericBlock();
            } else if (type == "timer") {
                programEditorPanel.addTimerBlock("timer");
            } else {
                programEditorPanel.addFilterBlock(type);
            }
        });
        btn.appendTo(menuentry);
        return menuentry;
    };

    //
    // Sensors
    //
    var temp        = createBtn("temperature", "temperature", "contains temperature sensor values");
    var humidity    = createBtn("humidity", "humidity", "contains humidity sensor values");
    var co2         = createBtn("CO2", "CO2", "contains carbon dioxide sensor values");
    var o2          = createBtn("O2", "O2", "contains oxygen sensor values");
    var light       = createBtn("light", "light", "contains light sensor values");
    var soil        = createBtn("soil moisture", "soilmoisture", "contains soil moisture sensor values");
    var particulate = createBtn("particulates", "particulates", "contains particulate matter sensor values");

    var sensorContent = $('<div>');
    sensorContent.append(temp);
    sensorContent.append(humidity);
    sensorContent.append(co2);
    sensorContent.append(o2);
    sensorContent.append(light);
    sensorContent.append(soil);
    sensorContent.append(particulate);
    var sensors = createSection("Input", sensorContent, false);
    container.append(sensors);

    //
    // Filters
    //
    var numericButton   = createBtn("number", "number", "contains a user-defined number");
    var timerButton        = createBtn("timer", "timer", "changes between 0 and 1 over user-defined time periods");
    var plusButton   = createBtn("plus", "plus", "adds two block values");
    var minusButton   = createBtn("minus", "minus", "subtracts one block value from another block value");
    var timesButton   = createBtn("times", "times", "multiplies two block values");
    var dividedbyButton   = createBtn("divided by", "divided by", "divides one block value by another block value");
    var greaterthanButton   = createBtn("greater than", "greater than", "compares two blocks using greater than");
    var lessthanButton   = createBtn("less than", "less than", "compares two blocks using less than");
    var equalsButton   = createBtn("equals", "equals", "calculates if blocks are equal, 1 if equal, 0 if not equal");
    var notequalsButton   = createBtn("not equals", "not equals", "calculates if blocks are NOT equal, 1 if not equal, 0 if equal");
    var andButton   = createBtn("and", "and", "calculates logical AND, 1 if two block values are both not 0");
    var orButton    = createBtn("or", "or", "calculates logical OR, 1 if at least one block values is not 0");
    var notButton   = createBtn("not", "not", "calculates logical NOT of block value");
    var nandButton   = createBtn("nand", "nand", "calculates logical NAND of two block values");
    var xorButton   = createBtn("xor", "xor", "calculates logical XOR of two block values");
    var absButton   = createBtn("absolute value", "absolute value", "calculates absolute value of block value");
    var simpleavgButton   = createBtn("moving average", "moving average", "calculates simple moving average of block values over time");
    var expavgButton   = createBtn("exp moving average", "exp moving average", "calculates exponential moving average of block values over time");

    var filterContent = $('<div>');
    filterContent.append(numericButton);
    filterContent.append(timerButton);
    filterContent.append(plusButton);
    filterContent.append(minusButton);
    filterContent.append(timesButton);
    filterContent.append(dividedbyButton);
    filterContent.append(greaterthanButton);
    filterContent.append(lessthanButton);
    filterContent.append(equalsButton);
    filterContent.append(notequalsButton);
    filterContent.append(andButton);
    filterContent.append(orButton);
    filterContent.append(notButton);
    filterContent.append(nandButton);
    filterContent.append(xorButton);
    filterContent.append(absButton);
    filterContent.append(simpleavgButton);
    filterContent.append(expavgButton);
    var menuSeparator = $('<div>', {class:'menu-separator'} );
    container.append(menuSeparator);
    var filters = createSection("Logic", filterContent, true);
    container.append(filters);

    //
    // Outputs: relays and plots and data bucket
    //
    var relay   = createBtn("relay","relay", "turns relay on if value is not 0, off if value is 0");
    var plot        = createBtn("plot","plot", "plots the last 30 seconds of block values");
    var databucket   = createBtn("data storage", "data storage", "stores dataset containing any connected blocks");

    var outputContent = $('<div>');
    outputContent.append(relay);
    outputContent.append(plot);
    outputContent.append(databucket);
    var menuSeparator = $('<div>', {class:'menu-separator'} );
    container.append(menuSeparator);
    var outputs = createSection("Outputs", outputContent, true);
    container.append(outputs);
}

