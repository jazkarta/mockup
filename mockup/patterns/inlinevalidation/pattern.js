/* Inline Validation pattern.
 *
 * Options:
 *    type(string): The type of form generating library. Either z3c.form, formlib or archetypes
 *
 * Documentation:
 *
 *    # z3c.form
 *
 *    {{ example-1 }}
 *
 * Example: example-1
 *    <div class="pat-inlinevalidation" data-pat-upload='{"type": "z3c.form"}'>
 *      <input id="form-widgets-IDublinCore-title"
 *             name="form.widgets.IDublinCore.title"
 *             class="text-widget required textline-field"
 *             value="Welcome to Plone" type="text">
 *    </div>
 */

define([
  'jquery',
  'pat-base'
], function ($, Base) {
  'use strict';

  var InlineValidation = Base.extend({
    name: 'inlinevalidation',
    trigger: '.pat-inlinevalidation',
    parser: 'mockup',

    render_error: function ($field, errmsg) {
       var $errbox = $('div.fieldErrorBox', $field);
       if (errmsg !== '') {
           $field.addClass('error');
           $errbox.html(errmsg);
       } else {
           $field.removeClass('error');
           $errbox.html('');
       }
    },

    append_url_path: function (url, extra) {
        // Add '/extra' on to the end of the URL, respecting querystring
        var i, ret, urlParts = url.split(/\?/);
        ret = urlParts[0];
        if (ret[ret.length - 1] !== '/') { ret += '/'; }
        ret += extra;
        for (i = 1; i < urlParts.length; i+=1) {
            ret += '?' + urlParts[i];
        }
        return ret;
    },

    queue: function (queueName, callback) {
        if (typeof callback === 'undefined') {
          callback = queueName;
          queueName = 'fx';  // 'fx' autoexecutes by default
        }
        $(window).queue(queueName, callback);
    },

    validate_archetypes_field: function (input) {
        var $input = $(input),
            $field = $input.closest('.field'),
            uid = $field.attr('data-uid'),
            fname = $field.attr('data-fieldname'),
            value = $input.val();

        // value is null for empty multiSelection select, turn it into a [] instead
        // so it does not break at_validate_field
        if ($input.prop('multiple') && value === null) {
            value = $([]).serialize();
        }

        // if value is an Array, it will be send as value[]=value1&value[]=value2 by $.post
        // turn it into something that will be useable or value will be omitted from the request
        var traditional;
        var params = $.param({uid: uid, fname: fname, value: value}, traditional = true);
        if ($field && uid && fname) {
            this.queue($.proxy(function(next) {
                $.ajax({
                    type: 'POST',
                    url: $('base').attr('href') + '/at_validate_field?' + params,
                    iframe: false,
                    success: $.proxy(function (data) {
                      this.render_error($field, data.errmsg);
                      next();
                    }, this),
                    error: function () { next(); },
                    dataType: 'json'
                });
            }, this));
        }
    },

    validate_formlib_field: function (input) {
        var $input = $(input),
            $field = $input.closest('.field'),
            $form = $field.closest('form'),
            fname = $field.attr('data-fieldname');

        this.queue($.proxy(function(next) {
            $form.ajaxSubmit({
                url: this.append_url_path($form.attr('action'), '@@formlib_validate_field'),
                data: {fname: fname},
                iframe: false,
                success: $.proxy(function (data) {
                    this.render_error($field, data.errmsg);
                    next();
                }, this),
                error: function () { next(); },
                dataType: 'json'
            });
        }, this));
    },

    validate_z3cform_field: function (input) {
        var $input = $(input),
            $field = $input.closest('.field'),
            $form = $field.closest('form'),
            fset = $input.closest('fieldset').attr('data-fieldset'),
            fname = $field.attr('data-fieldname');

        // Don't validate if the form has buttons pressed
        if (fname && $form.formSerialize().indexOf('form.buttons.') == -1) {
          this.queue($.proxy(function(next) {
              $form.ajaxSubmit({
                  url: this.append_url_path($form.attr('action'), '@@z3cform_validate_field'),
                  data: {fname: fname, fset: fset},
                  iframe: false,
                  success: $.proxy(function (data) {
                      this.render_error($field, data.errmsg);
                      next();
                  }, this),
                  error: function () { next(); },
                  dataType: 'json'
              });
          }, this));
        }
    },

    init: function () {
      var self = this;
      var validate_field = $.proxy(function (ev) {
        if (self.options.type === 'archetypes') {
          self.validate_archetypes_field(ev.target);
        } else if (self.options.type === 'z3c.form') {
          self.validate_z3cform_field(ev.target);
        } else if (self.options.type === 'formlib') {
          self.validate_formlib_field(ev.target);
        }
      });
      this.$el.find(
          'input[type="text"]:not(.pattern-pickadate-date, .pattern-pickadate-time), ' +
          'input[type="password"], ' +
          'input[type="checkbox"], ' +
          'select, ' +
          'textarea').on('blur', validate_field);

      // Special handling for related items
      this.$el.find('input.pat-relateditems.text-widget').on('change', validate_field);

      // Special handling for date patterns
      this.$el.find(
        'input.pattern-pickadate-date, ' +
        'input.pattern-pickadate-time').on('change', function (ev) {
          setTimeout(function () {validate_field(ev);}, 200);
        });
    },
  });
  return InlineValidation;
});
