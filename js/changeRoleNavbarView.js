define([
  'core/js/adapt'
], function(Adapt) {

  class ChangeRoleNavbarView extends Backbone.View {

    initialize() {
      this.listenTo(Adapt, {
        'navigation:changeRole': this.onChangeRoleClicked,
        'router:menu': this.show,
        'router:page': this.hide
      });
      this.render();
    }

    render() {
      const data = this.model.toJSON();
      const template = Handlebars.templates['navbar-button'];
      // if the 'skip navigation' button is present in the navigation, add the change role btn immediately after it (so that tab order is correct)
      const $skipNavButton = $('button[data-event="skipNavigation"]');
      if ($skipNavButton.length > 0) {
        this.setElement(template(data)).$el.insertAfter($skipNavButton);
        return;
      }
      // otherwise just add it to the start of the navbar
      this.setElement(template(data)).$el.prependTo($('.navigation-inner'));
    }

    show() {
      this.$el.removeClass('u-display-none');
    }

    hide() {
      this.$el.addClass('u-display-none');
    }

    onChangeRoleClicked() {
      const roleSelectorID = this.model.get('_roleSelectorID');
      if (!roleSelectorID) {
        Adapt.startController.returnToStartLocation();
        return;
      }

      Adapt.navigateToElement(roleSelectorID);
    }
  }

  return ChangeRoleNavbarView;
});
