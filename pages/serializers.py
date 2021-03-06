# Copyright (c) 2016, Djaodjin Inc.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
# PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
# CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
# EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
# PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
# OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
# WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
# OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
# ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import bleach
from django.db import transaction
from rest_framework import serializers

from .models import PageElement, ThemePackage, BootstrapVariable
from .settings import ALLOWED_TAGS, ALLOWED_ATTRIBUTES, ALLOWED_STYLES

#pylint: disable=no-init,old-style-class,abstract-method


class HTMLField(serializers.CharField):

    def __init__(self, **kwargs):
        self.html_tags = kwargs.pop('html_tags', [])
        self.html_attributes = kwargs.pop('html_attributes', {})
        self.html_styles = kwargs.pop('html_styles', [])
        self.html_strip = kwargs.pop('html_strip', False)
        super(HTMLField, self).__init__(**kwargs)

    def to_internal_value(self, data):
        return bleach.clean(data, tags=self.html_tags,
            attributes=self.html_attributes, styles=self.html_styles,
            strip=self.html_strip)


class RelationShipSerializer(serializers.Serializer): #pylint: disable=abstract-method
    orig_elements = serializers.ListField(
        child=serializers.SlugField(), required=False
        )
    dest_elements = serializers.ListField(
        child=serializers.SlugField(), required=False
        )

class PageElementSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)
    title = HTMLField(html_strip=True, required=False)
    text = HTMLField(html_tags=ALLOWED_TAGS, html_attributes=ALLOWED_ATTRIBUTES,
        html_styles=ALLOWED_STYLES, required=False)
    tag = serializers.SlugField(required=False)
    orig_elements = serializers.ListField(
        child=serializers.SlugField(required=False), required=False
        )
    dest_elements = serializers.ListField(
        child=serializers.SlugField(required=False), required=False
        )

    class Meta:
        model = PageElement
        fields = ('slug', 'title', 'text', 'tag',
                  'orig_elements', 'dest_elements')

    def create(self, validated_data):
        orig_elements = validated_data.pop('orig_elements', None)
        dest_elements = validated_data.pop('dest_elements', None)
        with transaction.atomic():
            instance = super(PageElementSerializer, self).create(validated_data)
            if orig_elements:
                for orig_element in orig_elements:
                    orig_element = PageElement.objects.get(slug=orig_element)
                    orig_element.add_relationship(instance)
                if dest_elements:
                    for dest_element in dest_elements:
                        dest_element = PageElement.objects.get(
                            slug=dest_element)
                        instance.add_relationship(dest_element)
        return instance

class BootstrapVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = BootstrapVariable
        field = ('variable_name', 'variable_value', 'created_at', 'updated_at')

class SiteCssSerializer(serializers.BaseSerializer):
    "A Simple serializer for the SiteCss model"
    def to_representation(self, obj):
        return {
            'created_at': obj.created_at.isoformat(),
            'updated_at': obj.updated_at.isoformat(),
            'url': obj.url
        }


class ThemePackageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ThemePackage
        fields = ('slug', 'name', 'created_at', 'updated_at', 'is_active')


class MediaItemSerializer(serializers.Serializer):

    location = serializers.CharField()

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass


class MediaItemListSerializer(serializers.Serializer):

    items = MediaItemSerializer(many=True)
    tags = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False)

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        pass


class EditionFileSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=True)
