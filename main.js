/*global $, ko*/
(function ($, ko) {
    function toDraggables(values) {
        return ko.utils.arrayMap(values, function (value) { 
            return {
                value: value,
                dragging: ko.observable(false)
            };
        });
    }

    var names = [
        'Declan',
        'Tessa',
        'Claire',
        'Violet',
        'Alice',
        'Mia',
        'Camille',
        'Aiden'
    ];

    var Node = function(data, parent){
        var self = this;
        this.parent = ko.observable(parent);
        this.name = ko.observable(data.name);
        this.children = ko.observableArray((data.children||[]).map(function(it){
            return new Node(it, self);
        }));
        this.parents = ko.computed({
            // deferEvaluation: true,
            read: function(){
                var parents = []
                  , parent = self.parent();
                while(parent){
                    parents.push(parent);
                    parent = parent.parent();
                }
                return parents;
            }
        })
        this.dragging = ko.observable();
    }

    var model = {
        hierarchy: {
            node: new Node({
                name: 'Root',
                children: [
                    { name: 'A', children: [
                        { name: 'Child 1' },
                        { name: 'Child 2' },
                        { name: 'Child 3' },
                    ]},
                    { name: 'B', children: [
                        { name: 'Child 1' },
                        { name: 'Child 2' },
                        { name: 'Child 3' },
                    ]},
                    { name: 'C', children: [
                        { name: 'Child 1' },
                        { name: 'Child 2' },
                        { name: 'Child 3' },
                    ]},
                    { name: 'D', children: [
                        { name: 'Child 1' },
                        { name: 'Child 2' },
                        { name: 'Child 3' },
                    ]}
                ]
            }),
            dragStart: function (item) {
                item.dragging(true);
            },
            dragEnd: function (item) {
                item.dragging(false);
            },
            dragEnter: function (event, data, model) {
                if(data==model)
                    return false;
                var parents = model.parents();
                if(parents.indexOf(data) >=0)
                    return false;
                // var match = data.value.match(/^(a|e|i|o|u|y)/i);

                // return !!match;
            },            
            reorder: function (event, dragData, zoneData) {
                if (dragData !== zoneData) {
                    var zoneDataIndex = model.sortable.items.indexOf(zoneData);
                    model.sortable.items.remove(dragData);
                    model.sortable.items.splice(zoneDataIndex, 0, dragData);
                }
            },            
            source: ko.observableArray([].concat(names)),
            target: ko.observableArray(),
            dropFromSource: function (data, model) {
                var parent = data.parent && data.parent();
                if(parent){
                    parent.children.remove(data)
                    data.parent(null)
                }
                model.source.remove(data);
                model.target.push(data);
            },
            dropFromTarget: function (node, target) {
                var parent = ko.utils.unwrapObservable(node.parent);
                if(parent){
                    parent.children.remove(node);
                }
                target.children.push(node);
                node.parent(target);
                // model.target.remove(data);
                // model.source.push(data);
            }
        },
        simple: {
            source: ko.observableArray([].concat(names)),
            target: ko.observableArray(),
            dropFromSource: function (data, model) {
                model.source.remove(data);
                model.target.push(data);
            },
            dropFromTarget: function (data, model) {
                model.target.remove(data);
                model.source.push(data);
            }
        },

        dragElement: {
            source: ko.observableArray([].concat(names)),
            target: ko.observableArray(),
            dropFromSource: function (data, model) {
                model.source.remove(data);
                model.target.push(data);
            },
            dropFromTarget: function (data, model) {
                model.target.remove(data);
                model.source.push(data);
            }
        },

        styling: {
            source: ko.observableArray(toDraggables(names)),
            target: ko.observableArray(),
            dragStart: function (item) {
                item.dragging(true);
            },
            dragEnd: function (item) {
                item.dragging(false);
            },
            dropFromSource: function (data, model) {
                model.source.remove(data);
                model.target.push(data);
            },
            dropFromTarget: function (data, model) {
                model.target.remove(data);
                model.source.push(data);
            }
        },

        rejectDrop: {
            source: ko.observableArray(toDraggables(names)),
            target: ko.observableArray(),
            dragStart: function (item) {
                item.dragging(true);
            },
            dragEnd: function (item) {
                item.dragging(false);
            },
            dragEnter: function (event, data, model) {
                var match = data.value.match(/^(a|e|i|o|u|y)/i);
                return !!match;
            },
            dropFromSource: function (data, model) {
                model.source.remove(data);
                model.target.push(data);
            },
            dropFromTarget: function (data, model) {
                model.target.remove(data);
                model.source.push(data);
            }
        },

        dragHandles: {
            source: ko.observableArray(toDraggables(names)),
            target: ko.observableArray(),
            dragStart: function (item, event) {
                var insideDragHandle = $(event.target).closest('.drag-handle').length > 0;
                if (insideDragHandle) {
                    item.dragging(true);
                    return true;
                } else {
                    return false;
                }
            },
            dragEnd: function (item, event) {
                item.dragging(false);
            },
            dropFromSource: function (data, model) {
                model.source.remove(data);
                model.target.push(data);
            },
            dropFromTarget: function (data, model) {
                model.target.remove(data);
                model.source.push(data);
            }
        },

        sortable: {
            items: ko.observableArray(toDraggables(names)),
            dragStart: function (item) {
                item.dragging(true);
            },
            dragEnd: function (item) {
                item.dragging(false);
            },
            reorder: function (event, dragData, zoneData) {
                if (dragData !== zoneData) {
                    var zoneDataIndex = model.sortable.items.indexOf(zoneData);
                    model.sortable.items.remove(dragData);
                    model.sortable.items.splice(zoneDataIndex, 0, dragData);
                }
            }
        },

        scrollWhileDragging: {
            items: ko.observableArray(toDraggables(names)),
            dragStart: function (item) {
                item.dragging(true);
            },
            dragEnd: function (item) {
                item.dragging(false);
            },
            reorder: function (event, dragData, zoneData) {
                if (dragData !== zoneData) {
                    var zoneDataIndex = model.scrollWhileDragging.items.indexOf(zoneData);
                    model.scrollWhileDragging.items.remove(dragData);
                    model.scrollWhileDragging.items.splice(zoneDataIndex, 0, dragData);
                }
            }
        }
    };
    ko.applyBindings(model, $('.demo')[0]);
}($, ko));
