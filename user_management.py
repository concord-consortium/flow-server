#
# Standard python imports
#
import json
import datetime

#
# Rhizo imports
#
from main.app                       import db
from main.users.auth                import create_user
from main.users.models              import User, OrganizationUser
from main.resources.resource_util   import _create_folders, _create_file, find_resource, read_resource


#
# Create user
#
def create_flow_user(   email,
                        username,
                        password,
                        fullname,
                        is_sso,
                        is_admin    ):

    #
    # Check if user exists
    #
    user = User.query.filter(User.user_name == username).first()
    if user is not None:
        print("User %s exists." % (username))
        return
    
    user_type = User.STANDARD_USER
    if is_admin:
        user_type = User.SYSTEM_ADMIN
        

    #
    # Create user
    #
    print("Creating user %s" % (username))
    user_id = create_user(  email, 
                            username, 
                            password, 
                            fullname,
                            User.STANDARD_USER)

    #
    # Add user to flow organization
    #
    print("Creating organization user.")
    org_user = OrganizationUser()
    org_user.organization_id = find_resource('/testing').id
    org_user.user_id = user_id
    org_user.is_admin = is_admin
    db.session.add(org_user)
    db.session.commit()

    #
    # Create a folder for this user to store their programs
    # and a folder for recorded datasets (sequences)
    #
    folders = [ 'testing/student-folders/%s/programs' % (username),
                'testing/student-folders/%s/datasets' % (username) ]

    for folder in folders:
        print("Creating student folder %s." % (folder))
        _create_folders(folder)

    #
    # Add some user metadata
    #
    path        = '%s/%s/%s/userinfo' % ('testing', 'student-folders', username)
    content     = json.dumps({
                        'is_sso': is_sso
                    })
    now         = datetime.datetime.now()
    resource    = _create_file(path, now, now, content)
 
    # print('Created flow user: %s' % (email))

    user = User.query.filter(User.id == user_id).first()
    return user

#
# Get userinfo metadata
#
def get_flow_userinfo(username):

    path        = '%s/%s/%s/userinfo' % ('testing', 'student-folders', username)
    resource    = find_resource(path)

    if resource is None:
        return {}

    data        = read_resource(resource)
    userinfo    = json.loads(data)

    return userinfo


#
# Delete a user
#
def delete_flow_user(username):

    #
    # Delete the specified user by username
    #
    user = User.query.filter(User.user_name == username).first()
    if user is None:
        print("No such user %s." % (username))
        return

    #
    # Delete user folder
    #
    student_folder = find_resource('/testing/student-folders/%s' % (username))
    if student_folder is not None:
        print("Deleting student folder %s." % (student_folder.name))
        db.session.delete(student_folder)
        db.session.commit()
    else:
        print("No student folder to delete.")


    #
    # Delete organization user
    #
    org_id = find_resource('/testing').id
    org_user = OrganizationUser.query.filter(
                    OrganizationUser.organization_id == org_id, 
                    OrganizationUser.user_id == user.id         ).first()

    if org_user is not None:
        print("Deleting organization user.")
        db.session.delete(org_user)
        db.session.commit()
    else:
        print("No organization user to delete.")

    #
    # Now delete the user
    #
    db.session.delete(user)
    db.session.commit()

    print('Deleted flow user: %s.' % (username))


