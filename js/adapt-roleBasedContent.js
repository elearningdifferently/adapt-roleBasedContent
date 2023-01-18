import Adapt from 'core/js/adapt';
import _ from 'underscore';
import ChangeRoleNavbarView from './changeRoleNavbarView';

/**
   * Applies the current role selection to the course, making any contentObject/article/block
   * not associated with the learner's chosen role available and any others unavailable
   * Also handles disabling/enabling & reconfiguring the banking for any assessments in the course
   * @param {String} roleId - id of role learner has selected.
   * @param {Boolean} [isRestore] - Indicates whether the role is being restored from suspend data or has just been selected by the learner
   */
function applyRoleSelection(roleId, isRestore = false) {
  const roleConfig = getRoleConfig(roleId);
  if (!roleConfig) return;

  Adapt.contentObjects.forEach(contentObject => {
    setAvailability(contentObject, roleConfig);
  });
  Adapt.articles.forEach(article => {
    setAvailability(article, roleConfig);
  });
  Adapt.blocks.forEach(block => {
    setAvailability(block, roleConfig, true);
    block.checkCompletionStatus();
  });

  handleAssessments(roleConfig, isRestore);

  // if locking is enabled we need force a re-check of it
  if (Adapt.course.get('_lockType')) Adapt.course.checkLocking();

  // in case we want to do any styling based on the choice of role...
  $('html').attr('data-roleid', roleId);

  Adapt.trigger('role:applied', isRestore);
}

/**
   * Fetches the relevant entry from `Adapt.course._roleBasedContent._roles` for the learner's chosen role
   * @param {string} roleId id of role learner has selected.
   * @return {object}
   */
export function getRoleConfig(roleId) {
  const roleConfig = _.find(Adapt.course.get('_roleBasedContent')._roles, _.matcher({ _roleId: roleId }));
  if (!roleConfig) {
    Adapt.log.error(`roleBasedContent: Unable to find any role configuration data for role '${roleId}'`);
    return;
  }

  return roleConfig;
}

export function isAvailableForRole(object, roleConfig) {
  if (!roleConfig?._roleId) return true;

  const roleBasedContent = object.get('_roleBasedContent');
  const excludedRoleIds = roleBasedContent?._excludeForRoles || [];

  if (excludedRoleIds.indexOf(roleConfig._roleId) >= 0) return false;

  let parent = object;

  // make object unavailable if any ancestor is not available for the given role
  // N.B. if an article is not available but its blocks are, trickle will be broken
  while ((parent = parent.getParent())) {

    const roleBasedContent = parent.get('_roleBasedContent');
    const excludedRoleIds = roleBasedContent?._excludeForRoles || [];

    if (excludedRoleIds.indexOf(roleConfig._roleId) >= 0) return false;
  }

  return true;
}

/**
   * Sets the `_isAvailable` property of the supplied contentObject/article/block by checking
   * to see if the chosen roleid is listed in the `_excludeForRoles` list or not
   * @param {Backbone.Model} object Reference to the contentObject, article or block
   * @param {Object} roleConfig Object representing the current role selection
   * @param {Boolean} [setOnChildren] Whether to cascade the change to the item's children or not.
   * Defaults to `false`, typically only used with blocks.
   */
function setAvailability(object, roleConfig, setOnChildren = false) {
  const makeAvailable = isAvailableForRole(object, roleConfig);
  if (setOnChildren) {
    object.setOnChildren('_isAvailable', makeAvailable);
    return;
  }
  object.set('_isAvailable', makeAvailable);
}

function handleAssessments(roleConfig, isRestore = false) {
  if (!Adapt.assessment) return;

  Adapt.assessment._assessments.forEach(assessmentArticle => {
    const isAvailable = (assessmentArticle.get('_isAvailable') && assessmentArticle.getParent().get('_isAvailable'));
    const assessmentSettings = getRoleSpecificAssessmentSettings(assessmentArticle.get('_assessment'), isAvailable, roleConfig);
    assessmentArticle.set('_assessment', assessmentSettings);

    if (!isAvailable || !roleConfig._banks || roleConfig._banks.length === 0 || isRestore) {
      return;
    }

    // if the learner is selecting/changing role & the change in role might affect this assessment's banking config, reset the assessment
    assessmentArticle.reset(true);
  });
}

function getRoleSpecificAssessmentSettings(assessmentSettings, isAvailable, roleConfig) {
  assessmentSettings._isEnabled = assessmentSettings._includeInTotalScore = isAvailable;

  if (!isAvailable || !roleConfig._banks) return assessmentSettings;

  roleConfig._banks.forEach(bank => {
    if (!bank._split) return;
    // assessment name can be left blank if course only has one assessment
    if (bank._assessmentName && bank._assessmentName !== assessmentSettings._id) return;

    assessmentSettings._banks._split = bank._split;
  });

  return assessmentSettings;
}

Adapt.on('adapt:start', () => {
  const courseConfig = Adapt.course.get('_roleBasedContent');
  if (courseConfig && courseConfig._showChangeRoleButton) {
    new ChangeRoleNavbarView({ model: new Backbone.Model(courseConfig) });
  }

  const roleId = Adapt.offlineStorage.get('role');
  if (!roleId) return;

  applyRoleSelection(roleId, true);
});

Adapt.on('role:selected', roleId => {
  if (!roleId) return;

  Adapt.offlineStorage.set('role', roleId);
  applyRoleSelection(roleId, false);
});
