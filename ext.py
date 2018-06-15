#
# Standard python imports
#
import json
import os
import subprocess
import datetime
import string
import random

#
# External imports
#
from flask              import request, abort, current_app, url_for, redirect, session
from flask_login        import current_user, login_user, logout_user
from sqlalchemy.orm.exc import NoResultFound
from rauth              import OAuth2Service

#
# Internal imports
#
from main.app                       import app, db
from main.users.models              import User, OrganizationUser
from main.resources.models          import Resource, ControllerStatus
from main.resources.resource_util   import _create_file, find_resource, read_resource, _create_folders
from main.extension                 import Extension

from user_management                import get_flow_userinfo, create_flow_user

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
        testblocks_enabled = int(request.args.get('blocks', 0)),
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
    if operation == 'list':
        if type == 'sequences':
            path = '%s/%s/%s/%s/%s' % (org_name, 'student-folders', username, 'datasets', filename)
        else:
            path = '%s/%s/%s/%s' % (org_name, 'student-folders', username, type)
    else:
        if type == 'datasets':
            if operation == 'load':
                path = '%s/%s/%s/%s/%s/metadata' % (org_name, 'student-folders', username, type, filename)
            elif operation == 'save':
                path = '%s/%s/%s/%s/%s/metadata' % (org_name, 'student-folders', username, type, filename)
            else:
                path = '%s/%s/%s/%s/%s' % (org_name, 'student-folders', username, type, filename)
        elif type == 'datasetmeta':	
            path = '%s/%s/%s/%s/%s' % (org_name, 'student-folders', username, 'datasets', filename)		
        elif type == 'programmeta':	
            path = '%s/%s/%s/%s/%s' % (org_name, 'student-folders', username, 'programs', filename)					
        else:
			
            path = '%s/%s/%s/%s/%s' % (org_name, 'student-folders', username, type, filename)

    #
    # Save op
    #
    def _save():
		if type == 'programmeta' or type == 'datasetmeta':
			contentmetadata = request.values.get('metadata').encode('utf-8')
			now         = datetime.datetime.now()
			pathm = '%s/%s' % (path, 'metadata')
			resourcem    = _create_file(pathm, now, now, contentmetadata)
			return json.dumps({
						'success': True,
						'message': 'Saved file metadata %s.' % (pathm)
					})

		else:
			content     = request.values.get('content').encode('utf-8')
			contentmetadata = request.values.get('metadata').encode('utf-8')
			now         = datetime.datetime.now()
			_create_folders(path)
			pathp = '%s/%s' % (path, 'program')
			pathm = '%s/%s' % (path, 'metadata')
			resourcep    = _create_file(pathp, now, now, content)
			resourcem    = _create_file(pathm, now, now, contentmetadata)
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
        if data is not None:
            data = data.decode('utf-8')
        
        return json.dumps({
                    'success': True,
                    'message': 'Loaded file %s.' % (resource.name),
                    'content': data
                },ensure_ascii=False)

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
            if type == 'datasets' or type == 'programs':
                ds_path = path + "/" + child.name
                file = find_resource(ds_path + "/metadata")
                if file is not None:
                    metadata = read_resource(file)
                    if metadata is not None:
                        metadata = json.loads(metadata)
                        metadata['recording_location'] = ds_path
            elif type == 'programs':
                ds_path = path + "/" + child.name
                file = find_resource(ds_path + "/metadata")
                if file is not None:
                    metadata = read_resource(file)
                    if metadata is not None:
                        metadata = json.loads(metadata)

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
# API for saving a program metadata to the rhizo-server
#
@app.route('/ext/flow/save_program_metadata', methods=['POST'])
def save_program_metadata():
    return file_operation('save', 'programmeta')
	
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
# API for loading named datasets saved on the rhizo-server
#
@app.route('/ext/flow/load_dataset', methods=['POST'])
def load_dataset():
    return file_operation('load', 'datasets')
 
#
# API for deleting a named dataset
#
@app.route('/ext/flow/delete_dataset', methods=['POST'])
def delete_dataset():
    return file_operation('delete', 'datasets')

#
# API for saving dataset metadata to the rhizo-server
#
@app.route('/ext/flow/save_dataset_metadata', methods=['POST'])
def save_dataset_metadata():
    return file_operation('save', 'datasetmeta')	

#
# API for listing dataset sequences saved on the rhizo-server
#
@app.route('/ext/flow/list_datasetsequences', methods=['POST'])
def list_datasetsequences():
    return file_operation('list', 'sequences')	

	
#
# Create portal oauth service
#
def get_portal_oauth():

    portal_base         = current_app.config.get('FLOW_PORTAL_SITE')
    client_id           = current_app.config.get('FLOW_PORTAL_SSO_CLIENT_ID')
    client_secret       = current_app.config.get('FLOW_PORTAL_SSO_CLIENT_SECRET')
    authorize_url       = '%s/auth/concord_id/authorize' % (portal_base)
    access_token_url    = '%s/auth/concord_id/access_token' % (portal_base)

    portal_oauth = OAuth2Service(
        name='portal',
        client_id=client_id,
        client_secret=client_secret,
        authorize_url=authorize_url,
        access_token_url=access_token_url,
        base_url=portal_base
    )

    return portal_oauth

#
# SSO Client Login
# 
@app.route('/ext/flow/login')
def sso_login():

    redirect_uri = url_for('authorized', _external=True)
    params = { 'redirect_uri': redirect_uri }

    url = get_portal_oauth().get_authorize_url(**params)
    return redirect(url)

#
# Logout
#
@app.route('/ext/flow/logout')
def logout():
    if current_user.is_authenticated:

        #
        # Can we and do we want to logout from SSO provider?
        #
        #userinfo = get_flow_userinfo(current_user.user_name)
        #if 'is_sso' in userinfo and userinfo['is_sso']:
        #    redirect_uri = url_for('authorized', _external=True)
        #    if 'oauth_code' in session:
        #        code = session['oauth_code']
        #        oauth_session = get_portal_oauth().get_auth_session(
        #                data={  'code': code,
        #                        'redirect_uri': redirect_uri },
        #                decoder=json.loads )
        #         #oauth_session.get('/users/sign_out')
        #         oauth_session.get('/api/v1/users/sign_out')

        #
        # Log out rhizo user
        #
        logout_user()

    return redirect(url_for('flow_app', features=1))


#
# SSO Callback
#
@app.route('/ext/flow/portal/authorized')
def authorized():

    redirect_uri = url_for('authorized', _external=True)
    code = request.args['code']
    session['oauth_code'] = code
    oauth_session = get_portal_oauth().get_auth_session(
                    data={  'code': code,
                            'redirect_uri': redirect_uri},
                    decoder=json.loads )

    user = oauth_session.get('/auth/user').json()

    email       = user['info']['email']
    username    = user['extra']['username']
    firstname   = user['extra']['first_name']
    lastname    = user['extra']['last_name']
    roles       = user['extra']['roles']

    is_sso      = True
    is_admin    = False

    if 'admin' in roles:
        is_admin = True


    #
    # Check if this is an SSO user
    #
    user = User.query.filter(User.user_name == username).first()
    if user is not None:
        userinfo  = get_flow_userinfo(username)

        if 'is_sso' in userinfo and userinfo['is_sso']:

            #
            # Log in this user.
            #
            print("Logging in user %s", username)
            login_user(user, remember = True)

        else:
            #
            # User exists but this is not an SSO user. 
            # Do not allow login for this user from 
            # the SSO provider.
            #
            print("User %s not an SSO user." % (username))
            return redirect(url_for('flow_app', features=1))
    
    else:
        #
        # There does not yet exist a user for this SSO provider account.
        # Create one.
        #
        print("Creating new user %s" % (username))

        #
        # Create random password. Is there a better way to do this?
        #
        password = ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(10))

        user = create_flow_user(email, username, password,
                                firstname + " " + lastname, is_sso, is_admin )
        login_user(user, remember = True)


    return redirect(url_for('flow_app', features=1))


#
# Get user info
#
@app.route('/ext/flow/get_user', methods=['POST'])
def get_user():

    if not current_user.is_authenticated:
        return json.dumps({
            'success': False,
            'message': 'User not authenticated.'
        })

    if not current_user.role == User.SYSTEM_ADMIN:
        return json.dumps({
            'success': False,
            'message': 'Only admin can perform this operation.'
        })

    username = request.values.get('username')

    user = User.query.filter(User.user_name == username).first()
    if user is None:
        return json.dumps({
                'success':  False,
                'message':  'User not found' })

    userinfo = get_flow_userinfo(username)

    is_sso = False
    if 'is_sso' in userinfo:
        is_sso = userinfo['is_sso']

    return json.dumps({
                'success':  True,
                'message':  'Found user info',
                'data':     {   'user_name':        user.user_name,
                                'email_address':    user.email_address,
                                'full_name':        user.full_name,
                                'is_sso':       is_sso,
                                'is_admin':     (user.role == User.SYSTEM_ADMIN)
                            } 
            })

    
#
# Set user info
#
@app.route('/ext/flow/set_user', methods=['POST'])
def set_user():

    if not current_user.is_authenticated:
        return json.dumps({
            'success': False,
            'message': 'User not authenticated.'
        })

    if not current_user.role == User.SYSTEM_ADMIN:
        return json.dumps({
            'success': False,
            'message': 'Only admin can perform this operation.'
        })

    username = request.values.get('username')

    user = User.query.filter(User.user_name == username).first()
    if user is None:
        return json.dumps({
                'success':  False,
                'message':  'User not found' })

    data = request.values.get('data')
    
    if data is None:
        return json.dumps({
                'success':  False,
                'message':  'No user data specified.' })

    data = json.loads(data);

    if 'is_admin' in data:
        if data['is_admin']:
            user.role = User.SYSTEM_ADMIN
        else:
            user.role = User.STANDARD_USER

    db.session.commit()

    return json.dumps({
                'success':  True,
                'message':  'User updated.' })



