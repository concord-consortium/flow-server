//
// Block palette
//
var ProgramEditorBlockPalette = function(options) {

    var container = options.container;

    var blockPalette = $('<div>');

    var createSection = function(name, content) {

        var div         = $('<div>', { css: {   width: '100%' } } );

        var collapse    = $('<div>', { css: {   float:      'right', 
                                                top:        '0px',
                                                padding:    '5px',
                                                cursor:     'pointer'
                                                                        } } );
        collapse.text("-");
        collapse.click( function(e) {
            if(content.is(":visible")) {
                content.hide();
            } else {
                content.show();
            }
        });

        div.append(collapse);
        var title = $('<div>').text(name);
        div.append(title); 
        div.append(content);

        return div;
    }

    var createSensorBtn = function(name) {
        var btn = $('<button>', { css: { width: '100%' } } );
        btn.text(name);
        return btn;
    };

    var temp        = createSensorBtn("Temperature");
    var humidity    = createSensorBtn("Humidity");
    var co2         = createSensorBtn("CO2");

    var sensorContent = $('<div>');
    sensorContent.append(temp);
    sensorContent.append(humidity);
    sensorContent.append(co2);

    var sensors     = createSection("Sensors", sensorContent);

    blockPalette.append(sensors);

    container.append(blockPalette);

}
