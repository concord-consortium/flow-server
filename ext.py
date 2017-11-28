#
# standard python imports
#
import json
import os
import subprocess
import datetime

#
# external imports
#
from flask import request, abort, current_app
from flask_login import current_user, login_user
from sqlalchemy.orm.exc import NoResultFound

#
# internal imports
#
from main.app                       import app, db
from main.users.models              import User, OrganizationUser
from main.resources.models          import Resource, ControllerStatus
from main.resources.resource_util   import _create_file, find_resource, read_resource
from main.extension                 import Extension


#
# current global instance of this extension
#
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
    flow_dir = os.path.dirname(os.path.realpath(__file__))
    if app.config.get('FLOW_WINDOWS', False):  # allow testing on Windows, where commands below don't work by default
        rhizo_server_version = 'X'
        flow_server_version = 'X'
    else:
        rhizo_server_version = subprocess.check_output(['git',
                                                        'describe',
                                                        '--tags',
                                                        '--always'  ]).rstrip()
        flow_server_version = subprocess.check_output([ 'git',
                                                        '-C',
                                                        '%s' % (flow_dir),
                                                        'describe',
                                                        '--tags',
                                                        '--always'  ]).rstrip()

    flow_user = None
    if current_user.is_authenticated:
        flow_user = { 
                'user_name':        current_user.user_name,
                'full_name':        current_user.full_name,
                'email_address':    current_user.email_address,
                'role':             current_user.role,
                'isAdmin':          (current_user.role == User.SYSTEM_ADMIN) }

    admin_enabled = 0
    if int(request.args.get('admin', 0)) == 1 and flow_user['isAdmin']:
        admin_enabled = 1

    #
    # Enable DataFlow2.0 features. When new features are complete,
    # remove this property and use the new features by default.
    # Remove the old views and flows.
    #
    features_enabled = 0
    if int(request.args.get('features', 0)) == 1:
        features_enabled = 1

    return flow_extension.render_template('flow-app.html',
        controllers_json = json.dumps(controller_infos),
        use_codap = (request.args.get('use_codap', 0) or request.args.get('codap', 0)),
        dev_enabled     = int(request.args.get('dev', default_dev_enabled)),
        admin_enabled           = admin_enabled,
        features_enabled        = features_enabled,
        flow_user               = json.dumps(flow_user),
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
    return json.dumps({
            'success': True,
            'controllers': info
        })


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



#
# Handle persistence operations for program files.
# Contains common code used across different program file
# persistence operations for API calls.
#
def file_operation(operation, type):

    if not current_user.is_authenticated:
        return json.dumps({
            'success': False,
            'message': 'User not authenticated.'
        })
 
    filename    = request.values.get('filename')

    if operation in ['save', 'load', 'delete'] and filename is None or filename == '':
        return json.dumps({
            'success': False,
            'message': 'No filename specified.'
        })

    username    = current_user.user_name
    org_user    = OrganizationUser.query.filter(OrganizationUser.user_id == current_user.id).first()

    if org_user is None:
        return json.dumps({
            'success': False,
            'message': 'Cannot find user organization.'
        })

    org_name = org_user.organization.name

    #
    # Construct path
    #
    if operation != 'list':
        if type != 'datasets':
            path = '%s/%s/%s/%s/%s' % (org_name, 'student-folders', username, type, filename)
        else:
            path = '%s/%s/%s/%s/%s/metadata' % (org_name, 'student-folders', username, type, filename)
    else:
        path = '%s/%s/%s/%s' % (org_name, 'student-folders', username, type)

    #
    # In some cases this expects to start with "/" but not in others???
    #
    # if not path.startswith('/'):
    #    path = '/' + path

    #
    # Save op
    #
    def _save():
        content     = request.values.get('content')
        now         = datetime.datetime.now()
        resource    = _create_file(path, now, now, content)
        return json.dumps({
                    'success': True,
                    'message': 'Saved file %s.' % (filename)
                })

    #
    # Load op
    #
    def _load():
        resource    = find_resource(path)
        data        = read_resource(resource)
        return json.dumps({
                    'success': True,
                    'message': 'Loaded file %s.' % (resource.name),
                    'content': data
                })

    #
    # Delete op
    #
    def _delete():
        resource    = find_resource(path)

        if resource is None:
            return json.dumps({
                        'success': False,
                        'message': 'Cannot find file %s.' % (filename)
                    })

        db.session.delete(resource)
        db.session.commit()
        return json.dumps({
                    'success': True,
                    'message': 'Deleted file %s.' % (resource.name)
                })

    #
    # List operation
    #
    def _list():
        resource    = find_resource(path)
        children    = Resource.query.filter(Resource.parent_id == resource.id, Resource.deleted == False)

        items = []
        for child in children:
            metadata = None

            #
            # For datasets, populate metadata.
            #
            if type == 'datasets':
                ds_path = path + "/" + child.name
                file = find_resource(ds_path + "/metadata")
                if file is not None:
                    metadata = read_resource(file)
                    if metadata is not None:
                        metadata = json.loads(metadata)
                        metadata['recording_location'] = ds_path

            items.append({  'name':     child.name,
                            'metadata': metadata    } )

        return json.dumps({
                'success':  True,
                'message':  'Listed %s' % (path),
                'items':    items
            })

    ops = { 'save':     _save,
            'load':     _load,
            'delete':   _delete,
            'list':     _list   }

    op = ops[operation]
    return op()


#
# API for saving a program to the rhizo-server
#
@app.route('/ext/flow/save_program', methods=['POST'])
def save_program():
    return file_operation('save', 'programs')

#
# API for loading (retrieving the contents of) a program 
# from the rhizo-server
#
@app.route('/ext/flow/load_program', methods=['POST'])
def load_program():
    return file_operation('load', 'programs')

#
# API to delete a saved program from the rhizo-server
#
@app.route('/ext/flow/delete_program', methods=['POST'])
def delete_program():
    return file_operation('delete', 'programs')


#
# API for listing programs saved on the rhizo-server
#
@app.route('/ext/flow/list_programs', methods=['POST'])
def list_programs():
    return file_operation('list', 'programs')

#
# API for listing named datasets saved on the rhizo-server
#
@app.route('/ext/flow/list_datasets', methods=['POST'])
def list_datasets():
    return file_operation('list', 'datasets')

#
# API for listing named datasets saved on the rhizo-server
#
@app.route('/ext/flow/load_dataset', methods=['POST'])
def load_dataset():
    return file_operation('load', 'datasets')
 

