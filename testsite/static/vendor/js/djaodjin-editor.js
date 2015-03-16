(function ($) {

    function Editor(element, options){
        return true;
    }

    Editor.prototype = {
        init: function(){
            var self = this;
            self.get_properties();
            if (!self.$el.attr('id') || self.$el.attr('id') === ""){
                throw new Error("editable element does not have valid id !");
            }

            self.$el.on('click', function(){
                self.toggle_input();
            });
        },

        get_element_properties:function(){
            var self = this;
            return self.$el;
        },

        get_properties: function(){
            var self = this;
            self.class_element = self.$el.attr('class');
            var element = self.get_element_properties();
            self.css_var = {
                'font-size' : element.css('font-size'),
                'line-height' : element.css('line-height'),
                'height' : parseInt(element.css('height').split("px"))+(parseInt(element.css('line-height').split('px'))-parseInt(element.css('font-size').split('px')))+'px',
                'margin-top' : element.css('margin-top'),
                'font-family' : element.css('font-family'),
                'font-weight' : element.css('font-weight'),
                'text-align' : element.css('text-align'),
                'padding-top': -(parseInt(element.css('line-height').split('px'))-parseInt(element.css('font-size').split('px')))+'px',
                'color' : element.css('color'),
                'width' : element.css('width'),
            };
        },

        input_editable: '<div class="input-group" id="editable_section"><textarea class="form-control editor" id="input_editor" value="" spellcheck="false"></textarea></div>',

        toggle_input:function(){
            var self = this;
            self.$el.replaceWith(self.input_editable);
            $('#input_editor').focus();
            $('#input_editor').val(self.get_origin_text());
            $('#input_editor').css(self.css_var);
            $('#input_editor').autosize({append:''});
            $('#input_editor').on('blur', function(event){
                self.save_edition(event);
            });
            $('body').on('click', function(event){
                var $target = $(event.target);
                if (($target.attr('class') && $target.attr('class').indexOf(self.options.no_change_editor) >= 0) || ($target.attr('id') && $target.attr('id').indexOf(self.options.no_change_editor) >= 0)){
                    $('#input_editor').unbind('blur');
                }
            });
            
            $('#input_editor').on('keyup', function(){
                self.check_input();
            });
            
        },

        get_saved_text: function(){
            return $('#input_editor').val();
        },

        get_displayed_text:function(){
            var self = this;
            return self.get_saved_text();
        },

        check_input: function(){
            var self = this;
            if (self.get_saved_text() === self.options.empty_input || self.get_saved_text() === ""){
                $('#input_editor').val(self.options.empty_input);
                $('#input_editor').css({'color':'red'});
                $('#input_editor').focus();
                return false;
            }else if (self.get_saved_text() != self.options.empty_input){
                if (self.get_saved_text().indexOf(self.options.empty_input) >= 0){
                    $('#input_editor').val(self.get_saved_text().split(self.options.empty_input)[1]);
                }
                $('#input_editor').css({'color':self.$el.css('color')});
                return true;
            }
        },

        save_edition: function(event){
            var self = this;
            var id_element = self.$el.attr("id");
            var saved_text = self.get_saved_text();
            
            var displayed_text = self.get_displayed_text();

            if (!self.check_input()){
                return false;
            }

            if (!id_element){
                id_element = 'undefined';
            }
            var data = {};
            var method = 'PUT';
            if (self.$el.attr('data-key')){
                data[self.$el.attr('data-key')] = $.trim(saved_text);
                method = 'PATCH';
            }else{
                data = {slug:id_element, text:$.trim(saved_text), old_text:self.origin_text, template_name:self.options.template_name, template_path:self.options.template_path, tag: self.$el.prop("tagName")};
            }
            self.$el.html(displayed_text);
            $('#editable_section').replaceWith(self.$el);
            if (!self.options.base_url){
                if ($('.error-label').length > 0){
                    $('.error-label').remove();
                }
                $('body').prepend('<div class="error-label">No base_url option provided. Please update your script to use save edition.</div>');
                return false;
            }else{
                $.ajax({
                    method:method,
                    async:false,
                    url: self.options.base_url + id_element +'/',
                    data:data,
                    success: function(data){
                        console.log('Success');
                    }
                });
            }
            
            self.init();
        },
    };

    function TextEditor(element, options){
        var _this = this;
        _this.el = element;
        _this.$el = $(element);
        _this.options = options;
        _this.init();
        return _this;
    }

    TextEditor.prototype = $.extend({}, Editor.prototype, {
        get_origin_text: function(){
            var self = this;
            self.origin_text = $.trim(self.$el.text());
            return self.origin_text;
        },
    });

    function MarkdownEditor(element, options){
        var _this = this;
        _this.el = element;
        _this.$el = $(element);
        _this.options = options;
        _this.init();
        return _this;
    }

    MarkdownEditor.prototype = $.extend({}, Editor.prototype,{
        get_element_properties:function(){
            var self = this;
            if (self.$el.prop('tagName') == 'DIV'){
                if (self.$el.children('p').length > 0){
                    return self.$el.children('p');
                }else{
                    return $('p');
                }
            }else{
                return self.$el;
            }
        },

        get_origin_text: function(){
            var self = this;
            self.origin_text = "";
            if (self.options.base_url){
                $.ajax({
                    method:'GET',
                    async:false,
                    url: self.options.base_url + self.$el.attr('id') +'/',
                    success: function(data){
                        if (self.$el.attr('data-key')){
                            self.origin_text = data[self.$el.attr('data-key')];
                        }else{
                            self.origin_text = data.text;
                        }
                    },
                    error: function(){
                        self.origin_text = $.trim(self.$el.text());
                    }
                });
            }
            return self.origin_text;
        },

        get_displayed_text: function(){
            var self = this;
            convert = new Markdown.getSanitizingConverter().makeHtml;
            return convert(self.get_saved_text());
        }
    });

    $.fn.editor = function(options, custom){
        var opts = $.extend( {}, $.fn.editor.defaults, options );
        return this.each(function() {
            if (!$.data($(this), 'editor')) {
                if ($(this).hasClass('edit-markdown')){
                    $.data($(this), 'editor', new MarkdownEditor($(this), opts));
                }else{
                    $.data($(this), 'editor', new TextEditor($(this), opts));
                }
            }
        });
    };

    $.fn.editor.defaults = {
        base_url: null, // Url to send request to server
        enable_markdown: true,
        template_name:'',
        template_path:'',
        csrf_token:'',
        enable_upload : false,
        img_upload_url:'',
        empty_input:'Please enter text!',
        no_change_editor: 'btn-toggle'

    };

}( jQuery ));