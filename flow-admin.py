#!/usr/bin/env python
#
# To ensure you can import rhizo-server modules set PYTHONPATH
# to point to rhize-server base dir.
# E.g.
# export PYTHONPATH=/home/user/rhizo-server/
#

from optparse                       import OptionParser

from main.app                       import db
from main.users.auth                import create_user
from main.users.models              import User, OrganizationUser
from main.resources.resource_util   import find_resource, _create_folders

if __name__ == '__main__':

    parser = OptionParser()
    parser.add_option(  '-c', 
                        '--create-user', 
                        dest='flow_user_spec', 
                        help='Create flow user specified in the format email:username:password:fullname',
                        default='')
    parser.add_option(  '-d', 
                        '--delete-user', 
                        dest='delete_username', 
                        help='Delete flow user specified by username',
                        default='')


    (options, args) = parser.parse_args()

    if options.flow_user_spec:
        parts       = options.flow_user_spec.split(':')
        email       = parts[0]
        username    = parts[1]
        password    = parts[2]
        fullname    = parts[3]
        assert '.' in email and '@' in email


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
        org_user.is_admin = False
        db.session.add(org_user)
        db.session.commit()

        #
        # Create a folder for this user to store their programs
        #
        student_folder = 'testing/student-folders/%s' % (username)
        print("Creating student folder %s." % (student_folder))
        _create_folders(student_folder)

        print('Created flow user: %s' % (email))

    elif options.delete_username:

        #
        # Delete the specified user by username
        #
        username = options.delete_username
        user = User.query.filter(User.user_name == username).first()
        if user is None:
            print("No such user %s." % (username))
            exit(1)

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


