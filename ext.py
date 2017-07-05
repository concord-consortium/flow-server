# standard python imports
import json


# external imports
from flask import request, abort, current_app
from flask_login import current_user, login_user
from sqlalchemy.orm.exc import NoResultFound


# internal imports
from main.app import app
from main.users.models import User, OrganizationUser
from main.resources.models import Resource
from main.extension import Extension


# current global instance of this extension
flow_extension = None


# a server extension class
class Flow(Extension):

    def __init__(self):
        super(Flow, self).__init__()

    def view(self, resource, parent):
        if resource.name == 'Flow':
            return self.view_flow_diagram(resource, parent)
        else:
            return None

    # view a resource; return None if extension does not provide a viewer for resource
    def view_flow_diagram(self, resource, parent):
        return flow_app()  # fix(later): use the current controller


# create an instance of the extension class
def create():
    global flow_extension
    flow_extension = Flow()
    return flow_extension


# display the data flow app (a single page app)
@app.route('/ext/flow')
def flow_app():
    controller_infos = []
    if current_user.is_authenticated:
        org_users = OrganizationUser.query.filter(OrganizationUser.user_id == current_user.id)
        for org_user in org_users:
            org_id = org_users[0].organization
            controllers = Resource.query.filter(Resource.parent_id == org_user.organization_id, Resource.deleted == False, Resource.type == Resource.CONTROLLER_FOLDER)
            for controller in controllers:
                controller_infos.append({
                    'id': controller.id,
                    'name': controller.name,
                    'path': controller.path(),
                })
    default_dev_enabled = current_app.config.get('FLOW_DEV', False)
    return flow_extension.render_template('flow-app.html',
        controllers_json = json.dumps(controller_infos),
        use_codap = (request.args.get('use_codap', 0) or request.args.get('codap', 0)),
        dev_enabled = int(request.args.get('dev', default_dev_enabled))
    )


# used for students to specify a controller without logging in first;
# if the controller is found, log them in using a student count (if one exists for the controller's organization)
@app.route('/ext/flow/select', methods=['POST'])
def select_controller():
    controller_name = request.form.get('controller_name')
    try:
        controller = Resource.query.filter(Resource.name == controller_name, Resource.type == Resource.CONTROLLER_FOLDER, Resource.deleted == False).one()
        organization = controller.parent
        if organization.type != Resource.ORGANIZATION_FOLDER:
            abort(403)
        user_name = organization.name + '-student'
        user = User.query.filter(User.user_name == user_name, User.deleted == False).one()
        login_user(user, remember = True)  # log the user in as a student
        return json.dumps({
            'id': controller.id,
            'name': controller.name,
            'path': controller.path(),
        })
    except NoResultFound:
        abort(403)
