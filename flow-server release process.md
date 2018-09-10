# Flow-Server Release Process

## Making flow-server release for staging or production
Use the following steps to make a flow-server pre-release for staging or release for production.

1. Ensure all desired flow-server source code changes are tested and merged into master
   * the flow-server GitHub repo can be found here to verify current state of source code: https://github.com/concord-consortium/flow-server/
   * If making a release for production, ensure any stories or bugs tied to source code on master have been QA tested and accepted on Pivotal Tracker


2. Create a new release tag on GitHub 
   * Click on the releases link on the flow-server repo and choose to "draft a new release"
   * Choose to create a new tag.  Use format vX.Y.Z-pre.YYYMMDD for a pre-release intended for staging and format vX.Y.Z.YYYMMDD for a release intended for production. Current version is 2.0.0 as of this writing.
   * Add additional release notes listing bug fixes and new features.  This information can be collected from the GitHub commit history or the completed Pivotal Tracker stories and bugs.  Be sure to add a note specifying the latest tag/release of the flow client which is compatible with the flow-server release you are making.  If additional changes have been added to the flow client since the last flow client tag/release, then also make a new tag/release of the flow client before continuing.  Flow client releases can be found here:
   https://github.com/concord-consortium/flow/releases
   * If making a pre-release intended for staging, check "this is a pre-release" checkbox

   
3. Add a new release story to Pivotal Tracker
   * In Pivotal Tracker, create a new story, set story type to release
   * Use the tag/release name as the name of the Pivotal Tracker story (e.g., "v2.0.0-pre.20180718") 
   * Specify the release date using the calendar tool 

   
4. Update appropriate server
   * If making a pre-release intended for staging, update staging to source code from release tag.  Otherwise, if making a release intended for production, update production to source code from release tag.
