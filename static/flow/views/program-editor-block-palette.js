//
// Block palette
//
var ProgramEditorBlockPalette = function(options) {

    var container = options.container;
    var programEditorPanel = options.programEditorPanel;

    var blockPalette = $('<div>');

    var createSection = function(name, content) {

        var div         = $('<div>', { css: {   width: '100%',
                                                cursor: 'pointer' } } );

        var title = $('<div>').text(name);
        title.click( function(e) {
            if(content.is(":visible")) {
                content.hide();
            } else {
                content.show();
            }
        });

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

    var filterContent = $('<div>');
    var filterButton = $('<button>', { css: { width: '100%' } } );
    filterButton.text('Filter');
    filterButton.click( function() {
        programEditorPanel.showFilterBlockSelector();
    });
    filterContent.append(filterButton);
    var filters = createSection("Filters", filterContent);
    blockPalette.append(filters);

    container.append(blockPalette);

}
