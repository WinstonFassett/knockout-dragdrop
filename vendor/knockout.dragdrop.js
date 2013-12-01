/*global ko, jQuery*/

// Github repository: https://github.com/One-com/knockout-dragdrop
// License: standard 3-clause BSD license https://raw.github.com/One-com/knockout-dragdrop/master/LICENCE

(function (factory) {
    if (typeof define === "function" && define.amd) {
        // AMD anonymous module with hard-coded dependency on "knockout"
        define(["knockout", "jquery"], factory);
    } else {
        // <script> tag: use the global `ko` and `jQuery`
        factory(ko, jQuery);
    }
})(function (ko, $) {
    var dropZones = {};
    var eventZones = {};

    var forEach = ko.utils.arrayForEach;
    var first = ko.utils.arrayFirst;
    var filter = ko.utils.arrayFilter;

   function isMouse(e){
        return (/^mouse/).test(e.type)
    }
    function isTouch(e){
        return (/^touch/).test(e.type)
    }

    function getPointerInfo(e){
        var info = {
            event: e,
            pointers: [],
            pointersById: {}           
        };        
        e = e.originalEvent || e;
        info.isTouch = isTouch(e);
        if(info.isTouch){
            var touches = e.type=="touchend" ? e.changedTouches : e.targetTouches;
            ko.utils.arrayPushAll(
                info.pointers, ko.utils.arrayMap(touches,function(it, i){
                    var p = {
                        identifier: it.identifier,
                        clientX: it.clientX,
                        clientY: it.clientY,
                        pageX: it.pageX,
                        pageY: it.pageY,
                        target: it.target
                    }
                    info.pointersById[p.identifier] = p;
                    return p;
                }
            ));
        } 
        if(isMouse(event)) {
            event = event.originalEvent || event;
            var mouseInfo = {
                identifier: 'mouse',
                clientX: event.clientX,
                clientY: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY,
                target: event.target
            };
            info.pointers.push(mouseInfo);
            info.pointersById['mouse'] = mouseInfo;
        }
        e.pointers = info;
        return info;
    }

    function Zone(args) {
        this.init(args);
    }

    Zone.prototype.init = function (args) {
        this.element = args.element;
        this.$element = $(args.element);
        this.data = args.data;
        this.dragEnter = args.dragEnter;
        this.dragOver = args.dragOver;
        this.dragLeave = args.dragLeave;
        this.active = false;
        this.inside = false;
        this.dirty = false;
    };

    Zone.prototype.refreshDomInfo = function () {
        var $element = this.$element;
        var offset = $element.offset();
        this.top = offset.top;
        this.left = offset.left;
        this.width = $element.outerWidth();
        this.height = $element.outerHeight();
    };


    Zone.prototype.isInside = function (x, y) {
        if (x < this.left || y < this.top) {
            return false;
        }

        if (this.left + this.width < x) {
            return false;
        }

        if (this.top + this.height < y) {
            return false;
        }
        return true;
    };

    Zone.prototype.update = function (event, data) {
        var pointer = event.pointer;
        if (this.isInside(pointer.pageX, pointer.pageY)) {
            if (!this.inside) {
                this.enter(event, data);
            }

            if (this.dragOver) {
                this.dragOver(event, data, this.data);
            }
        } else {
            this.leave(event);
        }
    };

    Zone.prototype.enter = function (event, data) {
        this.inside = true;
        if (this.dragEnter) {
            this.active = this.dragEnter(event, data, this.data) !== false;
        } else {
            this.active = true;
        }
        this.dirty = true;
    };

    Zone.prototype.leave = function (event) {
        if (event) {
            event.target = this.element;
        }

        if (this.inside && this.dragLeave) {
            this.dragLeave(event);
        }
        this.active = false;
        this.inside = false;
        this.dirty = true;
    };

    function DropZone(args) {
        this.init(args);
        this.drop = function (data) {
            args.drop(data, args.data);
        };
    }
    DropZone.prototype = Zone.prototype;

    DropZone.prototype.updateStyling = function () {
        if (this.dirty) {
            this.$element.toggleClass('drag-over', this.active);
            this.$element.toggleClass('drop-rejected', this.inside && !this.active);
        }
        this.dirty = false;
    };

    function DragElement($element) {
        this.$element = $element;
        this.$element.addClass('drag-element').css({
            'position': 'fixed',
            'z-index': 9998
        });
        this.$element.on('selectstart', false);
    }

    DragElement.prototype.updatePosition = function (event) {
        var pointer = event.pointer;
        this.$element.offset({
            'top': pointer.pageY,
            'left': pointer.pageX
        });
    };

    DragElement.prototype.remove = function () {
        this.$element.remove();
    };

    function Draggable(args) {
        this.name = args.name;
        this.dragStart = args.dragStart;
        this.dragEnd = args.dragEnd;
        this.data = args.data;
    }

    Draggable.prototype.startDrag = function (event) {
        if (this.dragStart && this.dragStart(this.data, event) === false) {
            return false;
        }
    };

    Draggable.prototype.drag = function (event) {
        var that = this;
        var name = this.name;
        var zones = dropZones[name].concat(eventZones[name]);

        forEach(zones, function (zone) {
            zone.refreshDomInfo();
        });

        forEach(zones, function (zone) {
            event.target = zone.element;
            zone.update(event, that.data);
        });

        forEach(dropZones[name], function (zone) {
            zone.updateStyling();
        });
    };

    Draggable.prototype.dropRejected = function () {
        var name = this.name;
        var insideAZone = first(dropZones[name], function (zone) {
            return zone.inside;
        });
        if (!insideAZone) {
            return false;
        }

        var noActiveZone = !first(dropZones[name], function (zone) {
            return zone.active;
        });
        return noActiveZone;
    };

    Draggable.prototype.drop = function (event) {
        var name = this.name;

        var dropZoneElement = $(event.target).closest('.drop-zone');
        var activeZones = filter(dropZones[name], function (zone) {
            return zone.active;
        });
        var winningDropZone = filter(activeZones, function (zone) {
            return zone.$element.is(dropZoneElement);
        })[0];

        forEach(dropZones[name].concat(eventZones[name]), function (zone) {
            zone.leave(event);
        });

        forEach(dropZones[name], function (zone) {
            zone.updateStyling();
        });

        if (this.dragEnd) {
            this.dragEnd(this.data, event);
        }

        if (winningDropZone && winningDropZone.drop) {
            winningDropZone.drop(this.data);
        }
    };

    function ScrollArea(element) {
        this.element = element;
        this.$element = $(element);
        this.scrollMargin = Math.floor(this.$element.innerHeight() / 10);
        this.offset = this.$element.offset();
        this.innerHeight = this.$element.innerHeight();
        this.scrollDeltaMin = 5;
        this.scrollDeltaMax = 30;
    }

    ScrollArea.prototype.scroll = function (x, y) {
        var topLimit = this.scrollMargin + this.offset.top;
        var speed, scrollDelta;
        if (y < topLimit) {
            speed = (topLimit - y) / this.scrollMargin;
            scrollDelta = speed * (this.scrollDeltaMax - this.scrollDeltaMin) + this.scrollDeltaMin;
            this.element.scrollTop -= scrollDelta;
        }

        var bottomLimit = this.offset.top + this.innerHeight - this.scrollMargin;
        if (y > bottomLimit) {
            speed = (y - bottomLimit) / this.scrollMargin;
            scrollDelta = speed * (this.scrollDeltaMax - this.scrollDeltaMin) + this.scrollDeltaMin;
            this.element.scrollTop += scrollDelta;
        }
    };

    ko.utils.extend(ko.bindingHandlers, {
        dropZone: {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var options = ko.utils.unwrapObservable(valueAccessor());
                var name = options.name;
                dropZones[name] = dropZones[name] || [];

                $(element).addClass('drop-zone');

                var zone = new DropZone({
                    element: element,
                    data: bindingContext && bindingContext.$data,
                    drop: options.drop,
                    dragEnter: options.dragEnter,
                    dragOver: options.dragOver,
                    dragLeave: options.dragLeave
                });
                dropZones[name].push(zone);

                ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                    zone.leave();
                    dropZones[name].splice(dropZones[name].indexOf(zone), 1);
                });
            }
        },

        dragEvents: {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var options = ko.utils.unwrapObservable(valueAccessor());
                var name = options.name;
                eventZones[name] = eventZones[name] || [];

                var zone = new Zone({
                    element: element,
                    data: bindingContext && bindingContext.$data,
                    dragEnter: options.dragEnter,
                    dragOver: options.dragOver,
                    dragLeave: options.dragLeave
                });
                eventZones[name].push(zone);

                ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                    zone.leave();
                    eventZones[name].splice(eventZones[name].indexOf(zone), 1);
                });
            }
        },

        dragZone: {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var options = ko.utils.unwrapObservable(valueAccessor());
                var name = options.name;
                dropZones[name] = dropZones[name] || [];
                eventZones[name] = eventZones[name] || [];

                var data = bindingContext && bindingContext.$data;

                var draggable = new Draggable({
                    name: name,
                    data: data,
                    dragStart: options.dragStart,
                    dragEnd: options.dragEnd
                });

                function createCloneProxyElement() {
                    var dragProxy = $(element).clone().appendTo($(element).parent());
                    dragProxy.css({
                        height: $(element).height(),
                        width: $(element).width(),
                        opacity: 70 / 100,
                        filter: "alpha(opacity=70"
                    });
                    return dragProxy;
                }

                function createTemplateProxyElement() {
                    var dragProxy = $('<div>').appendTo('body');
                    ko.renderTemplate(options.element, bindingContext, {}, dragProxy[0]);
                    return dragProxy;
                }

                $(element).on('selectstart', function (e) {
                    if (!$(e.target).is(':input')) {
                        return false;
                    }
                });

                $(element).addClass('draggable');

                $(element).on('mousedown touchstart', function (downEvent) {
                    
                    if ($(downEvent.target).is(':input')) {
                        return;
                    }

                    var lastPointers, currentPointers;

                    function updatePointers(event){
                        var p = getPointerInfo(event);
                        lastPointers = currentPointers;
                        currentPointers = p;
                        return p;
                    }

                    
                    var downPointers = updatePointers(downEvent);
                    var downPointer = downPointers.pointers[0];
                    
                    var offset = $(element).offset()
                    var pointerOffset = {
                        left: downPointer.pageX - offset.left,
                        top: downPointer.pageY - offset.top
                    };
                    
                    if (!downPointers.isTouch && downEvent.which !== 1) {
                        return true;
                    }

                    $(document).on('selectstart.drag', false);


                    function startDragging(startEvent) {                        
                        var currentPointer, lastPointer;

                        function updatePointer(event){
                            var p = updatePointers(event);
                            lastPointer = currentPointer;
                            event.pointer = currentPointer = p.pointersById[startPointer.identifier] || lastPointer;;
                            return currentPointer;
                        }

                        var p = updatePointers(startEvent);
                        startEvent.pointer = p.pointers[0];

                        var startPointers, startPointer;

                        $(element).off('touchend.startdrag mouseup.startdrag click.startdrag mouseleave.startdrag touchleave.startdrag mousemove.startdrag touchmove.startdrag');

                        var dragElement = null;
                        if (!options.element) {
                            dragElement = new DragElement(createCloneProxyElement());
                        }

                        if (draggable.startDrag(downEvent) === false) {
                            return false;
                        }

                        var $overlay = $('<div class="drag-overlay" unselectable="on">');
                        $overlay.css({
                            'z-index': 9999,
                            'position': 'fixed',
                            'top': 0,
                            'left': 0,
                            'right': 0,
                            'bottom': 0,
                            'cursor': 'move',
                            'background-color': 'white',
                            'opacity': 0,
                            'filter': "alpha(opacity=0)",
                            '-webkit-user-select': 'none',
                            '-moz-user-select': '-moz-none',
                            '-ms-user-select': 'none',
                            '-o-user-select': 'none',
                            'user-select': 'none'
                        });

                        $overlay.on('selectstart', false);
                        $overlay.appendTo('body');

                        if (options.element) {
                            dragElement = new DragElement(createTemplateProxyElement());
                        }

                        dragElement.updatePosition(startEvent);

                        var dragTimer = null;
                        var dropRejected = false;
                        function drag(event) {
                            draggable.drag(event);
                            if (draggable.dropRejected() !== dropRejected) {
                                $overlay.toggleClass('drop-rejected', draggable.dropRejected());
                                $overlay.css('cursor', draggable.dropRejected() ? 'no-drop' : 'move');
                                dropRejected = draggable.dropRejected();
                            }
                            dragTimer = setTimeout(function () {
                                drag(event);
                            }, 250);
                        }
                        function doMove(moveEvent){
                            // moveEvent.stopPropagation();
                            // moveEvent.preventDefault():
                            
                            if(!startPointers){
                                startPointers = p;
                                startPointer = p.pointers[0];
                            }
                            clearTimeout(dragTimer);
                            updatePointer(moveEvent)
                            dragElement.updatePosition(moveEvent);                            
                            drag(moveEvent);
                            return false;
                        }

                        $overlay.on('mousemove.drag touchmove.drag', function (moveEvent) {
                            doMove(moveEvent);
                        });

                        $overlay.on('mouseup.drag touchend.drag', function (upEvent) {
                            var pointer = updatePointer(upEvent);
                            clearTimeout(dragTimer);
                            dragElement.remove();    
                            $overlay.remove();                        
                            upEvent.target = document.elementFromPoint(pointer.clientX, pointer.clientY);
                            draggable.drop(upEvent);

                            $(document).off('selectstart.drag');
                            $overlay.off('mousemove.drag touchmove.drag');
                            $overlay.off('mouseup.drag touchend.drag')
                            return false;
                        });
                    }

                    $(element).one('mouseup.startdrag touchend.startdrag click.startdrag', function (event) {
                        $(element).off('mouseleave.startdrag touchleave.startdrag mousemove.startdrag touchmove.startdrag');
                        $(document).off('selectstart.drag');
                        return true;
                    });

                    $(element).on('mousemove.startdrag touchmove.startdrag', function (event) {
                        if ($(event.target).is(':input')) {
                            return;
                        }
                        var pointers = getPointerInfo(event);                        
                        var now = pointers.pointersById[downPointer.identifier];
                        var distance = Math.sqrt(Math.pow(downPointer.pageX - now.pageX, 2) +
                                                 Math.pow(downPointer.pageY - now.pageY, 2));
                        if (distance > 10) {
                            startDragging(event);
                        }
                    });

                    $(element).one('mouseleave.startdrag touchleave.startdrag', function (event) {
                        if ($(event.target).is(':input')) {
                            return;
                        }

                        startDragging(event);
                    });

                    return false;
                });

                ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                    $(document).off('selectstart.drag');
                });
            }
        },

        scrollableOnDragOver: {
            // TODO make this binding scroll on the x-axis as well
            init: function (element, valueAccessor, allBindingAccessor) {
                var name = ko.utils.unwrapObservable(valueAccessor());
                var scrollArea = null;
                var x, y;
                var timer;

                function scroll() {
                    scrollArea.scroll(x, y);
                }
                function dragEnter(e) {
                    scrollArea = new ScrollArea(element);
                    timer = setInterval(scroll, 100);
                }

                function dragOver(e) {
                    var pointer = e.pointer;
                    x = pointer.pageX;
                    y = pointer.pageY;
                }

                function dragLeave(e) {
                    clearTimeout(timer);
                }

                ko.bindingHandlers.dragEvents.init(element, function () {
                    return {
                        name: name,
                        dragEnter: dragEnter,
                        dragOver: dragOver,
                        dragLeave: dragLeave
                    };
                });
            }
        }
    });
});
