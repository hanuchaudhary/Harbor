"use client"

import * as React from "react"
import {
  createContext,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardSensor,
  MeasuringStrategy,
  Modifiers,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core"
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Slot } from "radix-ui"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

interface KanbanContextProps<T> {
  columns: Record<string, T[]>
  setColumns: (columns: Record<string, T[]>) => void
  getItemId: (item: T) => string
  columnIds: string[]
  activeId: UniqueIdentifier | null
  setActiveId: (id: UniqueIdentifier | null) => void
  findContainer: (id: UniqueIdentifier) => string | undefined
  isColumn: (id: UniqueIdentifier) => boolean
  modifiers?: Modifiers
}

const KanbanContext = createContext<KanbanContextProps<unknown>>({
  columns: {},
  setColumns: () => {},
  getItemId: () => "",
  columnIds: [],
  activeId: null,
  setActiveId: () => {},
  findContainer: () => undefined,
  isColumn: () => false,
  modifiers: undefined,
})

const ColumnContext = createContext<{
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners | undefined
  isDragging?: boolean
  disabled?: boolean
}>({
  attributes: {} as DraggableAttributes,
  listeners: undefined,
  isDragging: false,
  disabled: false,
})

const ItemContext = createContext<{
  listeners: DraggableSyntheticListeners | undefined
  isDragging?: boolean
  disabled?: boolean
}>({
  listeners: undefined,
  isDragging: false,
  disabled: false,
})

const IsOverlayContext = createContext(false)

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
}

export interface KanbanMoveEvent {
  event: DragEndEvent
  activeContainer: string
  activeIndex: number
  overContainer: string
  overIndex: number
}

export interface KanbanRootProps<T> extends HTMLAttributes<HTMLDivElement> {
  value: Record<string, T[]>
  onValueChange: (value: Record<string, T[]>) => void
  getItemValue: (item: T) => string
  children: ReactNode
  onMove?: (event: KanbanMoveEvent) => void
  asChild?: boolean
  modifiers?: Modifiers
}

function Kanban<T>({
  value,
  onValueChange,
  getItemValue,
  children,
  className,
  asChild = false,
  onMove,
  modifiers,
  ...props
}: KanbanRootProps<T>) {
  const columns = value
  const setColumns = onValueChange
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columnIds = useMemo(() => Object.keys(columns), [columns])

  const isColumn = useCallback(
    (id: UniqueIdentifier) => columnIds.includes(id as string),
    [columnIds]
  )

  const findContainer = useCallback(
    (id: UniqueIdentifier) => {
      if (isColumn(id)) return id as string
      const cols = columnsRef.current
      return Object.keys(cols).find((key) =>
        cols[key]?.some((item) => getItemValue(item as T) === id)
      )
    },
    [getItemValue, isColumn]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (onMove) return

      const { active, over } = event
      if (!over) return
      if (isColumn(active.id)) return

      const activeContainer = findContainer(active.id)
      const overContainer = findContainer(over.id)

      if (!activeContainer || !overContainer) return
      if (activeContainer === overContainer) return

      const cols = columnsRef.current
      const activeItems = cols[activeContainer]
      const overItems = cols[overContainer]

      if (!activeItems || !overItems) return

      const activeIndex = activeItems.findIndex(
        (item) => getItemValue(item as T) === active.id
      )
      if (activeIndex === -1) return

      let overIndex = overItems.findIndex(
        (item) => getItemValue(item as T) === over.id
      )
      if (isColumn(over.id)) {
        overIndex = overItems.length
      }

      const newActiveItems = [...activeItems]
      const newOverItems = [...overItems]
      const [movedItem] = newActiveItems.splice(activeIndex, 1)
      if (movedItem) {
        newOverItems.splice(Math.max(0, overIndex), 0, movedItem)
      }

      setColumns({
        ...cols,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      })
    },
    [findContainer, getItemValue, isColumn, setColumns, onMove]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over) return

      if (onMove && !isColumn(active.id)) {
        const activeContainer = findContainer(active.id)
        const overContainer = findContainer(over.id)

        if (activeContainer && overContainer) {
          const cols = columnsRef.current
          const activeItems = cols[activeContainer]
          const overItems = cols[overContainer]
          if (!activeItems || !overItems) return

          const activeIndex = activeItems.findIndex(
            (item) => getItemValue(item as T) === active.id
          )
          const overIndex = isColumn(over.id)
            ? overItems.length
            : overItems.findIndex(
                (item) => getItemValue(item as T) === over.id
              )

          onMove({
            event,
            activeContainer,
            activeIndex,
            overContainer,
            overIndex,
          })
        }
        return
      }

      if (isColumn(active.id) && isColumn(over.id)) {
        const activeIndex = columnIds.indexOf(active.id as string)
        const overIndex = columnIds.indexOf(over.id as string)
        if (activeIndex !== overIndex) {
          const cols = columnsRef.current
          const newOrder = arrayMove(Object.keys(cols), activeIndex, overIndex)
          const newColumns: Record<string, T[]> = {}
          newOrder.forEach((key) => {
            newColumns[key] = cols[key] ?? []
          })
          setColumns(newColumns)
        }
        return
      }

      const activeContainer = findContainer(active.id)
      const overContainer = findContainer(over.id)

      if (
        activeContainer &&
        overContainer &&
        activeContainer === overContainer
      ) {
        const cols = columnsRef.current
        const containerItems = cols[activeContainer]
        if (!containerItems) return

        const activeIndex = containerItems.findIndex(
          (item) => getItemValue(item as T) === active.id
        )
        const overIndex = containerItems.findIndex(
          (item) => getItemValue(item as T) === over.id
        )

        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          setColumns({
            ...cols,
            [activeContainer]: arrayMove(containerItems, activeIndex, overIndex),
          })
        }
      }
    },
    [columnIds, findContainer, getItemValue, isColumn, setColumns, onMove]
  )

  const contextValue = useMemo(
    () => ({
      columns,
      setColumns,
      getItemId: getItemValue,
      columnIds,
      activeId,
      setActiveId,
      findContainer,
      isColumn,
      modifiers,
    }),
    [
      columns,
      setColumns,
      getItemValue,
      columnIds,
      activeId,
      findContainer,
      isColumn,
      modifiers,
    ]
  )

  const Comp = asChild ? Slot.Root : "div"

  return (
    <KanbanContext.Provider value={contextValue as KanbanContextProps<unknown>}>
      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Comp
          data-slot="kanban"
          data-dragging={activeId !== null}
          className={cn(activeId !== null && "cursor-grabbing!", className)}
          {...props}
        >
          {children}
        </Comp>
      </DndContext>
    </KanbanContext.Provider>
  )
}

export interface KanbanBoardProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

function KanbanBoard({
  className,
  asChild = false,
  children,
  ...props
}: KanbanBoardProps) {
  const { columnIds } = useContext(KanbanContext)
  const Comp = asChild ? Slot.Root : "div"

  return (
    <SortableContext items={columnIds} strategy={rectSortingStrategy}>
      <Comp
        data-slot="kanban-board"
        className={cn("grid auto-rows-fr gap-4 sm:grid-cols-3", className)}
        {...props}
      >
        {children}
      </Comp>
    </SortableContext>
  )
}

export interface KanbanColumnProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
  asChild?: boolean
}

function KanbanColumn({
  value,
  className,
  asChild = false,
  disabled,
  children,
  ...props
}: KanbanColumnProps) {
  const isOverlay = useContext(IsOverlayContext)

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled,
    animateLayoutChanges,
  })

  const { activeId, isColumn } = useContext(KanbanContext)
  const isColumnDragging = activeId ? isColumn(activeId) : false

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  } as CSSProperties

  const Comp = asChild ? Slot.Root : "div"

  if (isOverlay) {
    return (
      <ColumnContext.Provider
        value={{
          attributes: {} as DraggableAttributes,
          listeners: undefined,
          isDragging: true,
          disabled: false,
        }}
      >
        <Comp
          data-slot="kanban-column"
          data-value={value}
          data-dragging={true}
          className={cn("group/kanban-column flex flex-col", className)}
          {...props}
        >
          {children}
        </Comp>
      </ColumnContext.Provider>
    )
  }

  return (
    <ColumnContext.Provider
      value={{ attributes, listeners, isDragging: isColumnDragging, disabled }}
    >
      <Comp
        data-slot="kanban-column"
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={setNodeRef}
        style={style}
        className={cn(
          "group/kanban-column flex flex-col",
          isSortableDragging && "z-50 opacity-50",
          disabled && "opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    </ColumnContext.Provider>
  )
}

export interface KanbanColumnHandleProps extends HTMLAttributes<HTMLDivElement> {
  cursor?: boolean
  asChild?: boolean
}

function KanbanColumnHandle({
  className,
  asChild = false,
  cursor = true,
  children,
  ...props
}: KanbanColumnHandleProps) {
  const { attributes, listeners, isDragging, disabled } =
    useContext(ColumnContext)

  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="kanban-column-handle"
      data-dragging={isDragging}
      data-disabled={disabled}
      {...attributes}
      {...listeners}
      className={cn(
        "opacity-0 transition-opacity group-hover/kanban-column:opacity-100",
        cursor && (isDragging ? "cursor-grabbing!" : "cursor-grab!"),
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export interface KanbanItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
  asChild?: boolean
}

function KanbanItem({
  value,
  className,
  asChild = false,
  disabled,
  children,
  ...props
}: KanbanItemProps) {
  const isOverlay = useContext(IsOverlayContext)

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    id: value,
    disabled,
    animateLayoutChanges,
  })

  const { activeId, isColumn } = useContext(KanbanContext)
  const isItemDragging = activeId ? !isColumn(activeId) : false

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  } as CSSProperties

  const Comp = asChild ? Slot.Root : "div"

  if (isOverlay) {
    return (
      <ItemContext.Provider
        value={{ listeners: undefined, isDragging: true, disabled: false }}
      >
        <Comp
          data-slot="kanban-item"
          data-value={value}
          data-dragging={true}
          className={cn(className)}
          {...props}
        >
          {children}
        </Comp>
      </ItemContext.Provider>
    )
  }

  return (
    <ItemContext.Provider
      value={{ listeners, isDragging: isItemDragging, disabled }}
    >
      <Comp
        data-slot="kanban-item"
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(
          isSortableDragging && "z-50 opacity-50",
          disabled && "opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    </ItemContext.Provider>
  )
}

export interface KanbanItemHandleProps extends HTMLAttributes<HTMLDivElement> {
  cursor?: boolean
  asChild?: boolean
}

function KanbanItemHandle({
  className,
  asChild = false,
  cursor = true,
  children,
  ...props
}: KanbanItemHandleProps) {
  const { listeners, isDragging, disabled } = useContext(ItemContext)

  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="kanban-item-handle"
      data-dragging={isDragging}
      data-disabled={disabled}
      {...listeners}
      className={cn(
        cursor && (isDragging ? "cursor-grabbing!" : "cursor-grab!"),
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export interface KanbanColumnContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  asChild?: boolean
}

function KanbanColumnContent({
  value,
  className,
  asChild = false,
  children,
  ...props
}: KanbanColumnContentProps) {
  const { columns, getItemId } = useContext(KanbanContext)

  const itemIds = useMemo(() => {
    const items = columns[value]
    if (!items) return []
    return items.map((item) => getItemId(item))
  }, [columns, getItemId, value])

  const Comp = asChild ? Slot.Root : "div"

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      <Comp
        data-slot="kanban-column-content"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children}
      </Comp>
    </SortableContext>
  )
}

export interface KanbanOverlayProps extends Omit<
  React.ComponentProps<typeof DragOverlay>,
  "children"
> {
  children?:
    | ReactNode
    | ((params: {
        value: UniqueIdentifier
        variant: "column" | "item"
      }) => ReactNode)
}

function KanbanOverlay({ children, className, ...props }: KanbanOverlayProps) {
  const { activeId, isColumn, modifiers } = useContext(KanbanContext)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => setMounted(true), [])

  const variant = activeId ? (isColumn(activeId) ? "column" : "item") : "item"

  const content =
    activeId && children
      ? typeof children === "function"
        ? children({ value: activeId, variant })
        : children
      : null

  if (!mounted) return null

  return createPortal(
    <DragOverlay
      dropAnimation={dropAnimationConfig}
      modifiers={modifiers}
      className={cn("z-50", activeId && "cursor-grabbing", className)}
      {...props}
    >
      <IsOverlayContext.Provider value={true}>
        {content}
      </IsOverlayContext.Provider>
    </DragOverlay>,
    document.body
  )
}

export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanColumnContent,
  KanbanOverlay,
}