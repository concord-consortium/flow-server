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
        
        var div = $('<div>', {class: 'diagramMenu'});
        var header = $('<div>', {class: 'diagramMenuHeader'} );
        var title = $('<div>', {class: 'diagramMenuTitle noSelect'} ).text(name);
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-chevron-down'} );
        
        if(name == 'input'){
            header.addClass('concordblue');
        }
        else if(name == 'logic'){
            header.addClass('concordgreen');
        }
        else if(name == 'outputs'){
            header.addClass('concordorange');
        }
        else{
            header.addClass('concordlightblue');
        }

        header.click( function(e) {
            if(content.is(":visible")) {
                chevron.removeClass('glyphicon-chevron-down');
                chevron.addClass('glyphicon-chevron-right');
                content.hide();
            } else {
                chevron.removeClass('glyphicon-chevron-right');
                chevron.addClass('glyphicon-chevron-down');
                content.show();
            }
        });
        div.append(header); 
        header.append(title); 
        header.append(chevron); 
        div.append(content);

        if(collapsedbydefault){
            chevron.removeClass('glyphicon-chevron-down');
            chevron.addClass('glyphicon-chevron-right');
            content.hide();
        }
        
        return div;
    }
    
    //
    // create the sensor menu section main button
    //
    var createSensorBtn = function(name, type, index) {
        var btn;
        if(index%2 == 0){
            btn = $('<button>', { class: 'diagramMenuEntry menulightgray' } );
        }
        else{
            btn = $('<button>', { class: 'diagramMenuEntry menudarkgray' } );
        }

        btn.text(name);
        btn.click( function() {
            if(name == "timer")
                programEditorPanel.addTimerBlock("timer");
            else
                programEditorPanel.addDeviceBlock(type);
        });
        
        return btn;
    };

    //
    // Sensors
    //
    var sensorentrynum = 0;
    var temp        = createSensorBtn("temperature", "temperature", sensorentrynum);
    sensorentrynum++;
    var humidity    = createSensorBtn("humidity", "humidity", sensorentrynum);
    sensorentrynum++;
    var co2         = createSensorBtn("CO2", "CO2", sensorentrynum);
    sensorentrynum++;
    var o2        = createSensorBtn("O2", "O2", sensorentrynum);
    sensorentrynum++;    
    var light       = createSensorBtn("light", "light", sensorentrynum);
    sensorentrynum++;
    var soil        = createSensorBtn("soil moisture", "soilmoisture", sensorentrynum);
    sensorentrynum++;
    var timer        = createSensorBtn("timer", "timer", sensorentrynum);

    var sensorContent = $('<div>');
    sensorContent.append(temp);
    sensorContent.append(humidity);
    sensorContent.append(co2);
    sensorContent.append(o2);
    sensorContent.append(light);
    sensorContent.append(soil);
    sensorContent.append(timer);
    var sensors     = createSection("input", sensorContent, false);
    container.append(sensors);

    //
    // Filters
    //
    var filterContent = $('<div>');

    //
    // create the filter menu section main button
    //
    var createFilterBtn = function(type, index) {
        var btn;
        if(index%2 == 0){
            btn = $('<button>', { text:type, class: 'diagramMenuEntry menulightgray' } );
        }
        else{
            btn = $('<button>', { text:type, class: 'diagramMenuEntry menudarkgray' } );
        }
        // console.log("[DEBUG] programEditorPanel", programEditorPanel);
        btn.click(type, function(e) {
            if(type=='number'){
                programEditorPanel.addNumericBlock();
            }
            else{
                programEditorPanel.addFilterBlock(e);
            }
        });

        return btn;
    }
    
    var entrynum = 0;
    var numericButton   = createFilterBtn("number", entrynum);
    entrynum++;
    var andButton   = createFilterBtn("and", entrynum);
    entrynum++;
    var orButton    = createFilterBtn("or", entrynum);
    entrynum++;
    var notButton   = createFilterBtn("not", entrynum);
    entrynum++;
    var xorButton   = createFilterBtn("xor", entrynum);
    entrynum++;
    var nandButton   = createFilterBtn("nand", entrynum);
    entrynum++;
    var plusButton   = createFilterBtn("plus", entrynum);
    entrynum++;
    var minusButton   = createFilterBtn("minus", entrynum);
    entrynum++;
    var timesButton   = createFilterBtn("times", entrynum);
    entrynum++;
    var dividedbyButton   = createFilterBtn("divided by", entrynum);
    entrynum++;
    var absButton   = createFilterBtn("absolute value", entrynum);
    entrynum++;
    var equalsButton   = createFilterBtn("equals", entrynum);
    entrynum++;
    var notequalsButton   = createFilterBtn("not equals", entrynum);
    entrynum++;
    var lessthanButton   = createFilterBtn("less than", entrynum);
    entrynum++;
    var greaterthanButton   = createFilterBtn("greater than", entrynum);
    entrynum++;
    var simpleavgButton   = createFilterBtn("moving average", entrynum);
    entrynum++;
    var expavgButton   = createFilterBtn("exp moving average", entrynum);
    

    var filterButton = $('<button>', { css: { width: '100%' } } );
    filterButton.text('...');
    filterButton.click( function() {
        programEditorPanel.showFilterBlockSelector();
    });

    filterContent.append(numericButton);
    filterContent.append(andButton);
    filterContent.append(orButton);
    filterContent.append(notButton);
    filterContent.append(xorButton);
    filterContent.append(nandButton);
    filterContent.append(plusButton);
    filterContent.append(minusButton);
    filterContent.append(timesButton);
    filterContent.append(dividedbyButton);
    filterContent.append(absButton);
    filterContent.append(equalsButton);
    filterContent.append(notequalsButton);
    filterContent.append(lessthanButton);
    filterContent.append(greaterthanButton);
    filterContent.append(simpleavgButton);
    filterContent.append(expavgButton);

    var filters = createSection("logic", filterContent, true);

    container.append(filters);
    
    //
    // Outputs: relays and plots and data bucket
    //
    var outputContent = $('<div>');
    var relay = $('<button>', { class: 'diagramMenuEntry menulightgray' } );
    relay.text('relay');
    relay.click( function() {
        programEditorPanel.addRelayBlock("relay");
    });
    var plot = $('<button>', { class: 'diagramMenuEntry menudarkgray' } );
    plot.text('plot');
    plot.click( function() {
        programEditorPanel.addPlotBlock("plot");
    });    
    
    var databucket = $('<button>', { class: 'diagramMenuEntry menulightgray' } );
    databucket.text('data storage');
    databucket.click( function() {
        programEditorPanel.addDataStorageBlock("data storage");
    });    

    outputContent.append(relay);
    outputContent.append(plot);
    outputContent.append(databucket);
    var outputs = createSection("outputs", outputContent, true);
    container.append(outputs);

}
