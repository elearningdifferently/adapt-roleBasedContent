# Role-based content extension

## Overview
This extension has the ability to 'exclude' pages, articles and blocks based on the role the learner has been assigned.

It also has the ability to change the 'banking split' of an assessment or assessments within the course based on the learner's role.

Excluding pages/articles/blocks is achieved by adding the following to the JSON for the page/article/block you want to be excluded for a role or roles:
```json
"_roleBasedContent": {
    "_excludeForRoles": [
        "role-1"
    ]
}
```
Or, for the same to apply to more than one role:
```json
"_roleBasedContent": {
    "_excludeForRoles": [
        "role-1",
        "role-2"
    ]
}
```

Assigning a 'banking split' for an assessment (or assessments) to a particular role is done using the role selector component itself as this makes for simpler configuration for users of the Adapt Authoring Tool.

In order to assign the learner a role, it is necessary to include a role selector component such as **adapt-roleSelector** (though others could be used, for more info see the [Notes section](#Notes) below).

If the content is tracked via the [adapt-contrib-spoor](https://github.com/adaptlearning/adapt-contrib-spoor) extension (or similar such as [adapt-contrib-xAPI](https://github.com/adaptlearning/adapt-contrib-xapi)) the learner's choice of role will be stored between sessions so that they do not have to select it every time they revisit the course.

If the learner needs to be given the option to change their role, this can be done by linking back to the role selector component, either through a simple hyperlink or by using the 'change role button' feature of this extension, which adds a button into the course's top navigation bar. This button is shown only on menus so that it does not take up much-needed space in the top navigation when the learner is viewing a course page. The change role button can be enabled by adding the following to course.json:
```js
"_roleBasedContent": {
    "_showChangeRoleButton": true,
    "buttonLabel": "Return to role selector",
    "buttonAriaLabel": "",
    "_roleSelectorID": "c-01"
}
```
Note that if you do not specify a `buttonLabel` (i.e. if you want the button to be icon-only), you should ensure you set `buttonAriaLabel` so that users of assistive technology know what the button does. You do not need to set `buttonAriaLabel` if a label is always shown as the button label will be read out instead.

The `_roleSelectorID` property should be set to the `_id` of the role selector component (or the block, article or page that contains it). If you do not set this, the learner will be returned to the course [start page](https://github.com/adaptlearning/adapt_framework/wiki/Content-starts-with-course.json) when the button is clicked.

## API
The API for this extension is relatively straightforward. On startup, it adds a listener for an event called `"role:selected"`. This event should include the `id` of the learner's role, i.e. `Adapt.trigger('role:selected', 'role-1');` notifies this extension that the learner has selected a role with and `id` of `"role-1"`.

In addition, it expects to find a list of roles (as an `Array`) in `Adapt.course._roleBasedContent._roles`. Each item in this list is an `Object` containing two properties:
1. `_roleId` (`string`) A unique identifier for the role e.g. `"role-1"`. As this value might be stored in the LMS (or LRS) it should be kept to a simple (ideally short) string of alphanumeric characters.
1. `_banks`  (`array`) Each item in this array must be an object containing the following properties:
    1. `_assessmentName` (`string`) The name/_id of the assessment the `_split` setting will be applied to (for more information see the [README for the assessment extension](https://github.com/adaptlearning/adapt-contrib-assessment)). This can be left blank if there is only one assessment in the course.
    1. `_split` (`string`) A comma-separated list of numbers corresponding to the number of questions to be drawn from each identified block for this particular role. For more information about this property, see the entry for `_assessment._banks._split` in [README for the assessment extension](https://github.com/adaptlearning/adapt-contrib-assessment).

The role selector component is responsible for defining this list of roles in the above location, something it should do in the `dataReady` part of Adapt's initialisation process.

If the extension finds the learner's choice of role in this list, it will store the role id  in `Adapt.offlineStorage` under the key `"role"` (i.e. it can be retrieved via `Adapt.offlineStorage.get('role');` and set via `Adapt.offlineStorage.set('role');`). It also stores the learner's choice in the DOM as an attribute called `data-roleid` on the `html` element, this is mainly to allow for role-specific styling - but also allows you to easily check which role was selected during development.

It then goes about applying the role selection to the pages, articles, blocks and assessments within the course.

## Notes
This extension is not tied to any one particular role selector component. If a more complex method of role selection is required - or simply that you want to have a different UI to the 'GMCQ-style' used by adapt-roleSelector - you could use a different role selector component altogether without having to change this extension. 

For example, you could use a Slider-style component to allow the learner to select their existing level of experience with the material, each level could be assigned to a particular role, allowing for content that is only relevant to those with a low level of experience to be hidden from those who have more experience. Similarly, a series of 'diagnostic questions' could be presented to the learner to determine their level of knowledge and which 'role' they should therefore be assigned so as to be presented with a course that matches their level of knowledge.

Equally, if using something like xAPI that allows for shared storage between courses (via the [Agent Profile](https://docs.learninglocker.net/http-xapi-agents/), for example), it would be possible to include the role component only in the initial course the learner is required to do - subsequent courses would be able to retreive the learner's choice of role from the LRS - so that the learner wouldn't have to choose their role every time they launch another course for the first time.