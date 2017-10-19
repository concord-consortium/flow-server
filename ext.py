# standard python imports
import json
import os
import subprocess
import datetime


# external imports
from flask import request, abort, current_app
from flask_login import current_user, login_user
from sqlalchemy.orm.exc import NoResultFound


# internal imports
from main.app import app
from main.users.models import User, OrganizationUser
from main.resources.models import Resource, ControllerStatus
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
    controller_infos = get_controller_info()

    default_dev_enabled = current_app.config.get('FLOW_DEV', False)


    #
    # Default working dir is root of "rhizo-server"
    # E.g. /home/user/rhizo-server
    #
    rhizo_server_version = subprocess.check_output(['git',
                                                    'describe',
                                                    '--always'  ]).rstrip()

    flow_dir = os.path.dirname(os.path.realpath(__file__))

    flow_server_version = subprocess.check_output([ 'git',
                                                    '-C',
                                                    '%s' % (flow_dir),
                                                    'describe',
                                                    '--always'  ]).rstrip()


    return flow_extension.render_template('flow-app.html',
        controllers_json = json.dumps(controller_infos),
        use_codap = (request.args.get('use_codap', 0) or request.args.get('codap', 0)),
        dev_enabled     = int(request.args.get('dev', default_dev_enabled)),
        admin_enabled   = int(request.args.get('admin', 0)),
        rhizo_server_version    = rhizo_server_version,
        flow_server_version     = flow_server_version
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


#
# API for obtaining controller info
#
@app.route('/ext/flow/controllers', methods=['POST', 'GET'])
def controller_info():
    info = get_controller_info()
    return json.dumps(info)


#
# Obtain an array of controllers
#
def get_controller_info():
    controller_infos = []
    if current_user.is_authenticated:
        org_users = OrganizationUser.query.filter(OrganizationUser.user_id == current_user.id)
        for org_user in org_users:
            org_id = org_users[0].organization
            controllers = Resource.query.filter(Resource.parent_id == org_user.organization_id, Resource.deleted == False, Resource.type == Resource.CONTROLLER_FOLDER)

            for controller in controllers:

                try:
                    controller_status = ControllerStatus.query.filter(ControllerStatus.id == controller.id).one()
                    if controller_status.last_watchdog_timestamp:
                        online = controller_status.last_watchdog_timestamp > datetime.datetime.utcnow() - datetime.timedelta(seconds=120)
                    else:
                        online = False

                    controller_infos.append({
                        'id': controller.id,
                        'name': controller.name,
                        'path': controller.path(),
                        'online': online,
                        'last_online': '%s' % (controller_status.last_watchdog_timestamp),
                        'status': json.loads(controller_status.attributes) if controller_status.attributes else {},
                    })
                except NoResultFound:
                    pass

    return controller_infos


