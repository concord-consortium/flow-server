//
// A program editor view.
// Edit dataflow programs and select RPi to run them on.
//
var ProgramEditorView = function(options) {

    var base = BaseView(options);

    var content     = jQuery('#'+base.getDivId());

    //
    // Create save widget
    //
    var saveWidget  = jQuery('<div>');
    var nameLabel   = jQuery('<label>').text('Name').css('padding', '2px');;
    var nameField   = jQuery('<input>').attr({ type: 'text' });
    var saveButton  = jQuery('<button>').text('Save')
                        .click( function() {
                            showTopLevelView('landing-page-view');
                        });
    var exitButton  = jQuery('<button>').text('Exit')
                        .click( function() {
                            showTopLevelView('landing-page-view');
                        });

    nameLabel.appendTo(saveWidget);
    nameField.appendTo(saveWidget);
    saveButton.appendTo(saveWidget);
    exitButton.appendTo(saveWidget);

    //
    // Create the editor panel
    //
    var editor      = jQuery('<div>', { css: { width: '75%' } });
    saveWidget.appendTo(editor);

    //
    // Create the "My Data" / "connect to pi" panel.
    //
    var dataTable   = jQuery('<table>');

    var dataTitle   = jQuery('<div>', { css: { paddingTop: '5px' } });
    dataTitle.text('My Data');

    var piList      = jQuery('<div>', { css: {
                            width:      '100%',
                            height:     '200px'  } });

    var choosePiBtn = jQuery('<button>', { css: {
                            // position:   'relative',
                            left:      '0px',
                            bottom:     '0px'   }});
    choosePiBtn.text('Connect to Pi');


    Util.addTableRow(dataTable, [dataTitle]);
    Util.addTableRow(dataTable, [piList]);
    Util.addTableRow(dataTable, [choosePiBtn]);

    //
    // Create main table and add all of our components
    //
    var table = jQuery('<table>', { css: { width: '100%' } });

    Util.addTableRow(table, [editor, dataTable] );

    table.appendTo(content);

    var textarea = jQuery('<textarea>', { width: 600, height: 200 } );
    textarea.appendTo(editor);

    return base;
}
