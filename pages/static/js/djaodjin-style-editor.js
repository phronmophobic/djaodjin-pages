/* global $ ace document:true */

(function ($) {
    "use strict";

    function StyleEditor(el, options){
        this.element = el;
        this.$element = $(el);
        this.options = options;
        this.$refreshButton = this.$element.find('.refresh-styles');
        this.init();
    }

    StyleEditor.prototype = {
        init: function () {
            var self = this;
            self.$refreshButton.on("click", function(event) {
                self.refreshStyles();
            });
            self.$element.find('button.style-reset-button').on("click", function(event){
                var $button = $(event.target);
                var $target = $(document.getElementById($button.attr('data-target')));
                $target.val($button.attr('data-reset-value'));
            });

            self.setupCustomEditors();
        },
        setupCustomEditors: function(){
            var self = this;

            // custom color editor
            self.$element.find("[data-dj-style-variable-editor=color]").each(function(){
                var $input = $(this);
                $input.wrap('<div>');
                $input.parent().addClass('input-group')
                var $button = $('<span class="input-group-btn"><a href="#" class="btn btn-default" id="cp4"><span class="glyphicon glyphicon-pencil" aria-hidden="true"></span></a></span>');
                $input.after($button);
                $button.colorpicker({customClass: 'color-picker-widget'}).on('changeColor', function(e) {
                    $input.val(e.color.toHex());
                });

            });


            var styleEditorZIndex = parseInt(self.$element.css('z-index'));
            // make sure color picker is on top of style editor
            $('.color-picker-widget').css('z-index', styleEditorZIndex + 1 + '');
        },
        getLess: function(){
            return this.options.iframe_view.contentWindow.less;
        },
        modifiedVars: function(){
            var formValues = $('#editable-styles-form').serializeArray();

            var modifiedVars = {};
            for(var i = 0; i < formValues.length ; i ++){
                var formElem = formValues[i];
                if ( formElem.value != '' ){
                    modifiedVars[formElem.name] = formElem.value;
                }
            }
            return modifiedVars;
        },
        refreshBootstrap: function(){
            // reload content
            this.options.iframe_view.src = this.options.iframe_view.src;
        },
        refreshStyles: function(){
            var self = this;
            var formValues = $('#editable-styles-form').serializeArray();
            var bootstrap_variables = []

            for(var i = 0; i < formValues.length ; i ++){
                var formElem = formValues[i];
                if ( formElem.value != '' ){
                    bootstrap_variables.push({
                        variable_name: formElem.name,
                        variable_value: formElem.value
                    });
                }
            }


            var less = self.getLess();
            var fileManager = less.environment.fileManagers[0];

            var instanceOptions = jQuery.extend(less.options, {modifyVars: self.modifiedVars()});
            fileManager.loadFile(less_href, null, instanceOptions, less.environment, function(e, loadedFile) {

                var data = loadedFile.contents,
                    path = loadedFile.filename,
                    webInfo = loadedFile.webInfo;

                var newFileInfo = {
                    currentDirectory: fileManager.getPath(path),
                    filename: path,
                    rootFilename: path,
                    relativeUrls: instanceOptions.relativeUrls};

                newFileInfo.entryPath = newFileInfo.currentDirectory;

                newFileInfo.rootpath = instanceOptions.rootpath || newFileInfo.currentDirectory;

                instanceOptions.rootFileInfo = newFileInfo;

                less.render(data, instanceOptions, function(e, result) {

                    $.ajax({
                        url: self.options.api_sitecss,
                        method: "POST",
                        contentType: "text/plain; charset=utf-8",
                        data: result.css,
                        success: function(response) {
                            $.ajax({
                                url: self.options.api_bootstrap_overrides,
                                method: "PUT",
                                datatype: "json",
                                contentType: "application/json; charset=utf-8",
                                data: JSON.stringify(bootstrap_variables),
                                success: function(response) {
                                    self.refreshBootstrap();
                                },
                                error: function(resp) {
                                    showErrorMessages(resp);
                                }
                            });
                        },
                        error: function(resp) {
                            showErrorMessages(resp);
                        }
                    });

                });

            });



        }
    };

    $.fn.djstyles = function(options) {
        var opts = $.extend( {}, $.fn.djstyles.defaults, options );
        return this.each(function() {
            if (!$.data(this, "djstyles")) {
                $.data(this, "djstyles", new StyleEditor(this, opts));
            }
        });
    };

    $.fn.djstyles.defaults = {
        api_bootstrap_overrides: "/api/bootstrap_variables"
    };

})(jQuery);
