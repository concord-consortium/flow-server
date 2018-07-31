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

        if(name == 'Input'){
            header.addClass('concordblue');
        }
        else if(name == 'Logic'){
            header.addClass('concordgreen');
        }
        else if(name == 'Outputs'){
            header.addClass('concordorange');
        }
        else{
            header.addClass('concordlightblue');
        }

        header.click( function(e) {
            if(content.is(":visible")) {
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

        if(collapsedbydefault){
            img.attr("src","flow-server/static/flow/images/icon-arrow-right-white.png");
            content.hide();
        }

        return div;
    }

    //
    // create the sensor menu section main button
    //
    var createBtn = function(name, type) {

        var div = $('<div>', { class: 'diagram-menu-entry container-light-gray' } );
        var btn;
        btn = $('<span>', { class: '' } );

        //icon
        var menuIcon = $('<img class="menu-icon">');
        if(type=="temperature")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-temperature.png");
        else if(type=="humidity")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-humidity.png");
        else if(type=="CO2")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-co2.png");
        else if(type=="O2")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-o2.png");
        else if(type=="light")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-light.png");
        else if(type=="soilmoisture")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-soilmoisture.png");
        else if(type=="number")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-numeric.png");
        else if(type=="plus")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-plus.png");
        else if(type=="minus")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-minus.png");
        else if(type=="times")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-times.png");
        else if(type=="divided by")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-divide.png");
        else if(type=="greater than")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-greaterthan.png");
        else if(type=="less than")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-lessthan.png");
        else if(type=="equals")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-equals.png");
        else if(type=="not equals")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-notequals.png");
        else if(type=="and")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-and.png");
        else if(type=="or")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-or.png");
        else if(type=="not")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-not.png");
        else if(type=="nand")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-nand.png");
        else if(type=="xor")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-xor.png");
        else if(type=="absolute value")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-abs.png");
        else if(type=="moving average")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-movingavg.png");
        else if(type=="exp moving average")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-logic-expmovingavg.png");
        else if(type=="timer")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-timer.png");
        else if(type=="relay")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-output-relay.png");
        else if(type=="plot")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-output-plot.png");
        else if(type=="data storage")
            menuIcon.attr('src', "flow-server/static/flow/images/icon-output-data.png");

        menuIcon.attr("height","20");
        menuIcon.appendTo(div);

        btn.text(name);
        div.click( function() {
            if(type=='temperature' || type=='humidity' || type=='CO2' || type=='O2' || type=='light' || type=='soilmoisture')
                programEditorPanel.addDeviceBlock(type);
            else if(type=='relay')
                programEditorPanel.addRelayBlock("relay");
            else if(type == "plot")
                programEditorPanel.addPlotBlock("plot");
            else if(type == "data storage")
                programEditorPanel.addDataStorageBlock("data storage");
            else if(type=='number'){
                programEditorPanel.addNumericBlock();
            }
            else if(type == "timer")
                programEditorPanel.addTimerBlock("timer");
            else{
                programEditorPanel.addFilterBlock(type);
            }
        });
        btn.appendTo(div);
        return div;
    };

    //
    // Sensors
    //
    var temp        = createBtn("temperature", "temperature");
    var humidity    = createBtn("humidity", "humidity");
    var co2         = createBtn("CO2", "CO2");
    var o2          = createBtn("O2", "O2");
    var light       = createBtn("light", "light");
    var soil        = createBtn("soil moisture", "soilmoisture");

    var sensorContent = $('<div>');
    sensorContent.append(temp);
    sensorContent.append(humidity);
    sensorContent.append(co2);
    sensorContent.append(o2);
    sensorContent.append(light);
    sensorContent.append(soil);
    var sensors     = createSection("Input", sensorContent, false);
    container.append(sensors);

    //
    // Filters
    //
    var numericButton   = createBtn("number","number");
    var timerButton        = createBtn("timer","timer");
    var plusButton   = createBtn("plus","plus");
    var minusButton   = createBtn("minus","minus");
    var timesButton   = createBtn("times","times");
    var dividedbyButton   = createBtn("divided by","divided by");
    var greaterthanButton   = createBtn("greater than","greater than");
    var lessthanButton   = createBtn("less than","less than");
    var equalsButton   = createBtn("equals","equals");
    var notequalsButton   = createBtn("not equals","not equals");
    var andButton   = createBtn("and","and");
    var orButton    = createBtn("or","or");
    var notButton   = createBtn("not","not");
    var nandButton   = createBtn("nand","nand");
    var xorButton   = createBtn("xor","xor");
    var absButton   = createBtn("absolute value","absolute value");
    var simpleavgButton   = createBtn("moving average","moving average");
    var expavgButton   = createBtn("exp moving average","exp moving average");

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
    var menuSeparator = jQuery('<div>', {class:'menu-separator'} );
    container.append(menuSeparator);
    var filters = createSection("Logic", filterContent, true);
    container.append(filters);

    //
    // Outputs: relays and plots and data bucket
    //
    var relay   = createBtn("relay","relay");
    var plot        = createBtn("plot","plot");
    var databucket   = createBtn("data storage","data storage");

    var outputContent = $('<div>');
    outputContent.append(relay);
    outputContent.append(plot);
    outputContent.append(databucket);
    var menuSeparator = jQuery('<div>', {class:'menu-separator'} );
    container.append(menuSeparator);
    var outputs = createSection("Outputs", outputContent, true);
    container.append(outputs);
}
