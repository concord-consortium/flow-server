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

from user_management                import get_flow_userinfo, delete_flow_user, create_flow_user


if __name__ == '__main__':

    parser = OptionParser()
    parser.add_option(  '-c', 
                        '--create-user', 
                        dest='flow_user_spec', 
                        help='Create flow user specified in the format email:username:password:fullname:is_sso:is_admin',
                        default='')
    parser.add_option(  '-d', 
                        '--delete-user', 
                        dest='delete_username', 
                        help='Delete flow user specified by username',
                        default='')
    parser.add_option(  '-l', 
                        '--list-users', 
                        action='store_true',
                        dest='list_users', 
                        help='List flow users',
                        default='')


    (options, args) = parser.parse_args()

    if options.flow_user_spec:
        parts       = options.flow_user_spec.split(':')
        email       = parts[0]
        username    = parts[1]
        password    = parts[2]
        fullname    = parts[3]
        is_sso      = (parts[4] in [ 'true', 'True' ])
        is_admin    = (parts[5] in [ 'true', 'True' ])
        assert '.' in email and '@' in email

        create_flow_user(email, username, password, fullname, is_sso, is_admin)

        # print('Created flow user: %s' % (username))

    elif options.delete_username:

        #
        # Delete the specified user by username
        #
        username = options.delete_username

        delete_flow_user(username)

        # print('Deleted flow user: %s.' % (username))

    elif options.list_users:

        users = User.query.all()
        for user in users:
            userinfo  = get_flow_userinfo(user.user_name)

            is_sso = False
            if 'is_sso' in userinfo:
                is_sso = userinfo['is_sso']

            print('Username     : %s' % (user.user_name))
            print('  email      : %s' % (user.email_address))
            print('  full name  : %s' % (user.full_name))
            print('  is_sso     : %s' % (is_sso))
            print('  is_admin   : %s' % ((user.role == User.SYSTEM_ADMIN)))

            print('')

