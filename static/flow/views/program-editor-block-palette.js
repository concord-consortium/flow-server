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
    var createSection = function(name, content) {
        
        var div = $('<div>', {class: 'diagramMenu'});
        var header = $('<div>', {class: 'diagramMenuHeader'} );
        var title = $('<div>', {class: 'diagramMenuTitle noSelect'} ).text(name);
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-chevron-down'} );
        
        if(name == 'sensors'){
            header.addClass('concorddarkblue');
        }
        else if(name == 'logic'){
            header.addClass('concordgreen');
        }
        else if(name == 'relays'){
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
    var light       = createSensorBtn("light", "light", sensorentrynum);
    sensorentrynum++;
    var soil        = createSensorBtn("soil moisture", "soilmoisture", sensorentrynum);

    var sensorContent = $('<div>');
    sensorContent.append(temp);
    sensorContent.append(humidity);
    sensorContent.append(co2);
    sensorContent.append(light);
    sensorContent.append(soil);

    var sensors     = createSection("sensors", sensorContent);
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
            if(type=='numeric'){
                programEditorPanel.addNumericBlock();
            }
            else{
                programEditorPanel.addFilterBlock(e);
            }
        });

        return btn;
    }
    
    var entrynum = 0;
    var numericButton   = createFilterBtn("numeric", entrynum);
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

    var filters = createSection("logic", filterContent);

    container.append(filters);
    
    //
    // Relays
    //
    var relayContent = $('<div>');
    var relay = $('<button>', { class: 'diagramMenuEntry menulightgray' } );
    relay.text('relay');
    relay.click( function() {
        programEditorPanel.addRelayBlock("relay");
    });
    relayContent.append(relay);
    var relays = createSection("relays", relayContent);
    container.append(relays);

}
