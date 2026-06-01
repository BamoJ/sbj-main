<script setup>
import {
  CheckboxRoot,
  CheckboxIndicator,
  RadioGroupRoot,
  RadioGroupItem,
  RadioGroupIndicator,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
} from 'reka-ui'

const form = reactive({
  name: '',
  email: '',
  message: '',
  checkboxes: { one: false, two: false },
  radio: '',
  select: '',
})

const selectOptions = ['Option 1', 'Option 2', 'Option 3']

// Submit state — drives the button label + the aria-live status text below.
const status = ref('idle') // 'idle' | 'loading' | 'success' | 'error'
const errorMsg = ref('')

// The API only consumes name/email/message today. The checkbox/radio/select
// fields are kept as a Reka UI showcase; extend the payload + server handler
// when they're given real meaning.
const onSubmit = async (e) => {
  e.preventDefault()
  if (status.value === 'loading') return

  status.value = 'loading'
  errorMsg.value = ''

  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        message: form.message,
      },
    })
    status.value = 'success'
    form.name = ''
    form.email = ''
    form.message = ''
  } catch (err) {
    status.value = 'error'
    errorMsg.value = err?.data?.statusMessage || err?.statusMessage || 'Something went wrong. Try again.'
  }
}
</script>

<template>
  <form
    class="border border-line bg-bg rounded-main p-8 flex max-w-[600px] flex-col gap-8"
    @submit="onSubmit"
  >
    <!-- Name -->
    <label class="flex flex-col gap-2">
      <span class="text-main font-medium">Name</span>
      <input
        v-model="form.name"
        type="text"
        placeholder="John Smith"
        class="bg-transparent text-fg border-b border-line py-2 outline-none placeholder:text-fg/40"
      />
    </label>

    <!-- Email -->
    <label class="flex flex-col gap-2">
      <span class="text-main font-medium">Email Address</span>
      <input
        v-model="form.email"
        type="email"
        placeholder="email@gmail.com"
        class="bg-transparent text-fg border-b border-line py-2 outline-none placeholder:text-fg/40"
      />
    </label>

    <!-- Message -->
    <label class="flex flex-col gap-2">
      <span class="text-main font-medium">Message</span>
      <textarea
        v-model="form.message"
        rows="4"
        placeholder="Your Message"
        class="bg-transparent text-fg border-b border-line py-2 outline-none placeholder:text-fg/40 resize-y"
      ></textarea>
    </label>

    <!-- Checkboxes -->
    <div class="flex flex-wrap gap-8">
      <label class="flex items-center gap-3 cursor-pointer">
        <CheckboxRoot
          v-model="form.checkboxes.one"
          class="w-3 h-3 rounded-full border border-line flex items-center justify-center data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors"
        >
          <CheckboxIndicator class="w-2 h-2 rounded-full bg-on-primary" />
        </CheckboxRoot>
        <span class="text-main">Checkbox</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <CheckboxRoot
          v-model="form.checkboxes.two"
          class="w-3 h-3 rounded-full border border-line flex items-center justify-center data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors"
        >
          <CheckboxIndicator class="w-2 h-2 rounded-full bg-on-primary" />
        </CheckboxRoot>
        <span class="text-main">Checkbox</span>
      </label>
    </div>

    <!-- Radio group -->
    <RadioGroupRoot v-model="form.radio" class="flex flex-wrap gap-8">
      <label v-for="n in 3" :key="n" class="flex items-center gap-3 cursor-pointer">
        <RadioGroupItem
          :value="`radio-${n}`"
          class="w-3 h-3 rounded-full border border-line flex items-center justify-center transition-colors"
        >
          <RadioGroupIndicator class="w-2 h-2 rounded-full bg-primary" />
        </RadioGroupItem>
        <span class="text-main">Radio {{ n }}</span>
      </label>
    </RadioGroupRoot>

    <!-- Select -->
    <label class="flex flex-col gap-2">
      <span class="text-main font-medium">Select Field</span>
      <SelectRoot v-model="form.select">
        <SelectTrigger
          class="bg-transparent text-fg border-b border-line py-2 flex items-center justify-between outline-none data-[placeholder]:text-fg/40"
        >
          <SelectValue placeholder="Select one..." />
          <SelectIcon class="text-fg/60">▾</SelectIcon>
        </SelectTrigger>
        <SelectPortal>
          <SelectContent
            class="bg-bg border border-line rounded-small py-2 shadow-lg z-50 min-w-[var(--reka-select-trigger-width)]"
            position="popper"
            :side-offset="4"
          >
            <SelectViewport>
              <SelectItem
                v-for="opt in selectOptions"
                :key="opt"
                :value="opt"
                class="px-4 py-2 text-main cursor-pointer outline-none data-[highlighted]:bg-fg/10"
              >
                <SelectItemText>{{ opt }}</SelectItemText>
              </SelectItem>
            </SelectViewport>
          </SelectContent>
        </SelectPortal>
      </SelectRoot>
    </label>

    <!-- Submit + status -->
    <div class="flex flex-col gap-3">
      <div>
        <Button type="submit" variant="primary" :disabled="status === 'loading'">
          {{ status === 'loading' ? 'Sending…' : 'Submit' }}
        </Button>
      </div>
      <p
        v-if="status === 'success'"
        class="text-main text-fg"
        role="status"
        aria-live="polite"
      >
        Thanks — message sent. I'll get back to you shortly.
      </p>
      <p
        v-else-if="status === 'error'"
        class="text-main text-fg/70"
        role="alert"
        aria-live="assertive"
      >
        {{ errorMsg }}
      </p>
    </div>
  </form>
</template>
