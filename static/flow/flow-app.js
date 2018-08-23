// This file provide top-level control for the data flow app.
//
// Initialize the app
//
function initFlowApp() {
    registerTopLevelView(LoginPageView({
        id: 'login-page-view'
    }));
    registerTopLevelView(LandingPageView({
        id: 'landing-page-view'
    }));
    registerTopLevelView(ProgramEditorView({
        id: 'program-editor-view'
    }));
    registerTopLevelView(AdminView({
        id: 'admin-view'
    }));
    showTopLevelView('login-page-view');
    if(g_fullscreen) {
        FullScreenWidget();
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

    for (var key in topLevelViews) {
        view = topLevelViews[key];
        view.hide();
    }

    for (var key in topLevelViews) {
        view = topLevelViews[key];
        if (key == id) {
            view.show();
        }
    }
}