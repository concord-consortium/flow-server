// This file provide top-level control for the data flow app.

//
// initialize the app
//
function initFlowApp() {
    if(g_featuresEnabled) {
        registerTopLevelView(LandingPageView({id: 'landing-page-view'}));
        registerTopLevelView(ProgramEditorView({id: 'program-editor-view'}));
        registerTopLevelView(AdminView({id: 'admin-view'}));

        showTopLevelView('landing-page-view');

    } else {
        //
        // Legacy flow. Delete this when DF2.0 UI is ready.
        //
	    showControllerSelector();
    }
}

//
// Store top level views here.
//
var topLevelViews = {};

//
// Register a top level view
//
function registerTopLevelView(instance) {
    topLevelViews[instance.getDivId()] = instance;
}

//
// Get a top level view
//
function getTopLevelView(id) {
    return topLevelViews[id];
}

//
// Display the specified top level view and hide all others
//
function showTopLevelView(id) {
    for(var key in topLevelViews) {
        view = topLevelViews[key];
        if(key == id) {
            view.show();
        } else {
            // console.log("[DEBUG] hiding", id);
            view.hide();
        }
    }
}

//
// Change screens within the app:
// show the controller selection screen
//
function showControllerSelector() {
    initControllerSelector();
    $('#controllerSelectorPanel').show();
    $('#controllerAdminPanel').hide();
    $('#controllerViewerPanel').hide();
    $('#diagramEditorPanel').hide();
    $('#plotterPanel').hide();
}

//
// Change screens within the app:
// show the controller contents (diagram list) screen
//
function showControllerViewer() {
    initControllerViewer();
    $('#controllerSelectorPanel').hide();
    $('#controllerViewerPanel').show();
    $('#diagramEditorPanel').hide();
    $('#plotterPanel').hide();
}

//
// Change screens within the app: 
// show the controller admin screen
//
function showAdminView() {
    initAdminView();
    $('#controllerAdminPanel').show();
    $('#controllerSelectorPanel').hide();
    $('#diagramEditorPanel').hide();
    $('#plotterPanel').hide();
}



// change screens within the app: show the flow diagram editor screen
function showDiagramEditor() {
	initDiagramEditor();
	$('#controllerSelectorPanel').hide();
	$('#controllerViewerPanel').hide();
	$('#diagramEditorPanel').show();
	$('#plotterPanel').hide();
}


// change screens within the app: show the plotter screen
function showPlotter() {
	initPlotter();
	$('#controllerSelectorPanel').hide();
	$('#controllerViewerPanel').hide();
	$('#diagramEditorPanel').hide();
	$('#plotterPanel').show();
}
