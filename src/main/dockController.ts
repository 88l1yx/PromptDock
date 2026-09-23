import { BrowserWindow, screen, type Display } from 'electron'
import type { DockSnapshot } from '../shared/types'

const DOCK_ZONE_RATIO = 0.3
const DOCK_ZONE_MIN = 220
const DOCK_ZONE_MAX = 560
const DETACH_THRESHOLD = 8
const EDGE_TRIGGER_PX = 18
const POLL_INTERVAL_MS = 60
const COLLAPSE_DELAY_MS = 420
const TYPING_GRACE_MS = 1600
const MOVE_SETTLE_MS = 180
const COLLAPSE_ANIMATION_MS = 230
const EXPAND_ANIMATION_MS = 250
const SNAP_SUPPRESSION_MS = 650
const PROGRAMMATIC_MOVE_GUARD_MS = 220

export class DockController {
  private readonly window: BrowserWindow
  private readonly onState: (snapshot: DockSnapshot) => void
  private pollTimer: NodeJS.Timeout | null = null
  private moveSettleTimer: NodeJS.Timeout | null = null
  private animationTimer: NodeJS.Timeout | null = null
  private dockedDisplayId: number | null = null
  private docked = false
  private hidden = false
  private pinned = false
  private animating = false
  private dragging = false
  private phase: DockSnapshot['phase'] = 'free'
  private lastInsideAt = Date.now()
  private lastActivityAt = 0
  private snapSuppressedUntil = 0
  private programmaticMoveUntil = 0
  private lastSnapshot = ''

  constructor(window: BrowserWindow, onState: (snapshot: DockSnapshot) => void) {
    this.window = window
    this.onState = onState
  }

  start(): void {
    this.window.on('move', this.handleMove)
    this.window.on('resize', this.handleResize)
    this.pollTimer = setInterval(() => this.pollCursor(), POLL_INTERVAL_MS)
    this.emitState()
  }

  stop(): void {
    this.window.removeListener('move', this.handleMove)
    this.window.removeListener('resize', this.handleResize)

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.moveSettleTimer) {
      clearTimeout(this.moveSettleTimer)
      this.moveSettleTimer = null
    }
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
      this.animationTimer = null
    }
  }

  setPinned(pinned: boolean): void {
    this.pinned = pinned

    if (pinned && this.docked && this.hidden && !this.animating) {
      this.showFromEdge()
    } else {
      this.emitState()
    }
  }

  markActivity(): void {
    this.lastActivityAt = Date.now()
  }

  private readonly handleMove = (): void => {
    if (this.animating || this.window.isDestroyed()) {
      return
    }

    if (Date.now() < this.programmaticMoveUntil) {
      return
    }

    this.dragging = true

    if (this.moveSettleTimer) {
      clearTimeout(this.moveSettleTimer)
    }

    this.moveSettleTimer = setTimeout(() => {
      this.dragging = false
      this.moveSettleTimer = null
      this.evaluateWindowPosition()
    }, MOVE_SETTLE_MS)
  }

  private readonly handleResize = (): void => {
    if (!this.docked || this.hidden || this.animating || this.window.isDestroyed()) {
      return
    }

    const display = this.getDockedDisplay()
    if (!display) {
      return
    }

    const bounds = this.window.getBounds()
    const targetX = display.bounds.x + display.bounds.width - bounds.width

    if (Math.abs(bounds.x - targetX) > 1) {
      this.setBoundsProgrammatically({ ...bounds, x: targetX })
    }
  }

  private evaluateWindowPosition(): void {
    if (this.window.isDestroyed()) {
      return
    }

    const bounds = this.window.getBounds()
    const display = screen.getDisplayNearestPoint({
      x: bounds.x + bounds.width,
      y: Math.round(bounds.y + bounds.height / 2)
    })
    const rightEdge = display.bounds.x + display.bounds.width
    const gap = rightEdge - (bounds.x + bounds.width)
    const dockZone = Math.max(
      DOCK_ZONE_MIN,
      Math.min(DOCK_ZONE_MAX, display.workArea.width * DOCK_ZONE_RATIO)
    )
    const hasVerticalOverlap =
      bounds.y + bounds.height > display.workArea.y + 24 &&
      bounds.y < display.workArea.y + display.workArea.height - 24

    if (this.docked) {
      if (!hasVerticalOverlap || gap > DETACH_THRESHOLD) {
        this.undock(true)
      } else if (Math.abs(gap) > 1) {
        this.setBoundsProgrammatically({ ...bounds, x: rightEdge - bounds.width })
      }
      return
    }

    if (
      hasVerticalOverlap &&
      bounds.x <= rightEdge - 72 &&
      gap <= dockZone &&
      Date.now() >= this.snapSuppressedUntil
    ) {
      this.dock(display)
    }
  }

  private dock(display: Display): void {
    this.dockedDisplayId = display.id
    this.docked = true
    this.hidden = false
    this.phase = 'docked'
    this.snapSuppressedUntil = 0
    this.lastInsideAt = Date.now()

    const bounds = this.window.getBounds()
    const maxY = Math.max(display.workArea.y, display.workArea.y + display.workArea.height - bounds.height)
    const y = Math.min(Math.max(bounds.y, display.workArea.y), maxY)
    const x = display.bounds.x + display.bounds.width - bounds.width

    if (Math.abs(bounds.x - x) > 1 || Math.abs(bounds.y - y) > 1) {
      this.setBoundsProgrammatically({ ...bounds, x, y })
    }

    this.emitState()
  }

  private undock(suppressSnap: boolean): void {
    this.docked = false
    this.hidden = false
    this.phase = 'free'
    this.dockedDisplayId = null
    this.window.setIgnoreMouseEvents(false)

    if (suppressSnap) {
      this.snapSuppressedUntil = Date.now() + SNAP_SUPPRESSION_MS
    }

    this.emitState()
  }

  private pollCursor(): void {
    if (!this.docked || this.animating || this.dragging || this.window.isDestroyed()) {
      return
    }

    const display = this.getDockedDisplay()
    if (!display) {
      this.undock(false)
      return
    }

    if (this.pinned && this.hidden) {
      this.showFromEdge()
      return
    }

    const cursor = screen.getCursorScreenPoint()
    const displayRight = display.bounds.x + display.bounds.width

    if (this.hidden) {
      const nearEdge =
        cursor.x >= displayRight - EDGE_TRIGGER_PX &&
        cursor.x <= displayRight + 2 &&
        cursor.y >= display.bounds.y &&
        cursor.y <= display.bounds.y + display.bounds.height

      if (nearEdge) {
        this.lastInsideAt = Date.now()
        this.showFromEdge()
      }
      return
    }

    const bounds = this.window.getBounds()
    const cursorInside =
      cursor.x >= bounds.x - 8 &&
      cursor.x <= bounds.x + bounds.width + 8 &&
      cursor.y >= bounds.y - 8 &&
      cursor.y <= bounds.y + bounds.height + 8

    if (cursorInside) {
      this.lastInsideAt = Date.now()
      return
    }

    const now = Date.now()
    const canCollapse =
      !this.pinned &&
      now - this.lastInsideAt >= COLLAPSE_DELAY_MS &&
      now - this.lastActivityAt >= TYPING_GRACE_MS

    if (canCollapse) {
      this.hideToEdge()
    }
  }

  private showFromEdge(): void {
    const display = this.getDockedDisplay()
    if (!display || !this.hidden || this.animating) {
      return
    }

    this.hidden = false
    this.animating = true
    this.phase = 'expanding'
    this.lastInsideAt = Date.now()
    this.window.setIgnoreMouseEvents(false)
    this.window.showInactive()
    this.emitState()

    this.animationTimer = setTimeout(() => {
      this.animating = false
      this.animationTimer = null

      if (this.docked) {
        this.phase = 'docked'
        this.emitState()
      }
    }, EXPAND_ANIMATION_MS)
  }

  private hideToEdge(): void {
    if (!this.docked || this.hidden || this.animating) {
      return
    }

    this.hidden = true
    this.animating = true
    this.phase = 'collapsing'
    this.window.setIgnoreMouseEvents(true, { forward: true })
    this.emitState()

    this.animationTimer = setTimeout(() => {
      this.animating = false
      this.animationTimer = null

      if (this.docked) {
        this.phase = 'hidden'
        this.emitState()
      }
    }, COLLAPSE_ANIMATION_MS)
  }

  private getDockedDisplay(): Display | null {
    if (this.dockedDisplayId === null) {
      return null
    }

    return screen.getAllDisplays().find((display) => display.id === this.dockedDisplayId) ?? null
  }

  private setBoundsProgrammatically(bounds: Electron.Rectangle): void {
    this.programmaticMoveUntil = Date.now() + PROGRAMMATIC_MOVE_GUARD_MS
    this.window.setBounds(bounds, false)
  }

  private emitState(): void {
    const snapshot: DockSnapshot = {
      docked: this.docked,
      hidden: this.hidden,
      pinned: this.pinned,
      phase: this.phase
    }
    const serialized = JSON.stringify(snapshot)

    if (serialized !== this.lastSnapshot) {
      this.lastSnapshot = serialized
      this.onState(snapshot)
    }
  }
}
