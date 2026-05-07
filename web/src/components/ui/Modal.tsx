// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
}

export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>

            {/* Centering container — flexbox handles position, framer-motion handles scale */}
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  className="pointer-events-auto w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900 flex flex-col max-h-[90vh]"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                >
                  {(title || description) && (
                    <div className="flex shrink-0 items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div>
                        {title && (
                          <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                      <Dialog.Close className="ml-4 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
                        <X className="h-4 w-4" />
                      </Dialog.Close>
                    </div>
                  )}

                  {!title && !description && (
                    <Dialog.Close className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-colors z-10">
                      <X className="h-4 w-4" />
                    </Dialog.Close>
                  )}

                  <div className="overflow-y-auto flex-1">
                    {children}
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
