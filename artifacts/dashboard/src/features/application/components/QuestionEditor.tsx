import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { ApplicationQuestion, ApplicationQuestionType } from '@/types/application'

function makeQuestion(): ApplicationQuestion {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: null,
    type: 'short_text',
    required: true,
    order: 0,
    options: [],
  }
}

export function QuestionEditor({
  questions,
  onChange,
}: {
  questions: ApplicationQuestion[]
  onChange: (questions: ApplicationQuestion[]) => void
}) {
  const addQuestion = () => {
    const updated = [...questions, makeQuestion()]
    onChange(reorder(updated))
  }

  const removeQuestion = (idx: number) => {
    onChange(reorder(questions.filter((_, i) => i !== idx)))
  }

  const updateQuestion = (idx: number, patch: Partial<ApplicationQuestion>) => {
    const updated = [...questions]
    updated[idx] = { ...updated[idx], ...patch }
    onChange(reorder(updated))
  }

  const moveQuestion = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= questions.length) return
    const updated = [...questions]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    onChange(reorder(updated))
  }

  const addOption = (questionIdx: number) => {
    const updated = [...questions]
    const q = updated[questionIdx]
    q.options = [
      ...(q.options ?? []),
      { id: crypto.randomUUID(), label: '' },
    ]
    onChange(reorder(updated))
  }

  const updateOption = (questionIdx: number, optionIdx: number, label: string) => {
    const updated = [...questions]
    const opts = [...(updated[questionIdx].options ?? [])]
    opts[optionIdx] = { ...opts[optionIdx], label }
    updated[questionIdx] = { ...updated[questionIdx], options: opts }
    onChange(reorder(updated))
  }

  const removeOption = (questionIdx: number, optionIdx: number) => {
    const updated = [...questions]
    updated[questionIdx] = {
      ...updated[questionIdx],
      options: (updated[questionIdx].options ?? []).filter((_, i) => i !== optionIdx),
    }
    onChange(reorder(updated))
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <Card key={q.id} className="border-border bg-card/50">
          <CardHeader className="flex flex-row items-center gap-2 py-3 px-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={idx === 0}
                onClick={() => moveQuestion(idx, 'up')}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={idx === questions.length - 1}
                onClick={() => moveQuestion(idx, 'down')}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <GripVertical className="h-4 w-4 opacity-50" />
            </div>
            <CardTitle className="text-sm">{`Question ${idx + 1}`}</CardTitle>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => removeQuestion(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid gap-2">
              <Label className="text-xs">Title</Label>
              <Input
                className="h-9"
                placeholder="What is your favorite color?"
                value={q.title}
                onChange={(e) => updateQuestion(idx, { title: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs">Type</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground"
                  value={q.type}
                  onChange={(e) =>
                    updateQuestion(idx, {
                      type: e.target.value as ApplicationQuestionType,
                      options: e.target.value === 'multiple_choice' ? q.options : [],
                    })
                  }
                >
                  <option value="short_text">Short Text</option>
                  <option value="paragraph">Paragraph</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="yes_no">Yes / No</option>
                </select>
              </div>
              <label className="mt-5 flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={q.required}
                  onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                />
                <span className="text-xs text-muted-foreground">Required</span>
              </label>
            </div>

            {q.type === 'multiple_choice' && (
              <div className="space-y-1.5 pl-1">
                <Label className="text-xs">Options</Label>
                {(q.options ?? []).map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Input
                      className="h-8 flex-1"
                      placeholder={`Option ${oi + 1}`}
                      value={opt.label}
                      onChange={(e) => updateOption(idx, oi, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => removeOption(idx, oi)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addOption(idx)}>
                  <Plus className="mr-1 h-3 w-3" /> Add option
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" size="sm" className="w-full" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" /> Add Question
      </Button>
    </div>
  )
}

function reorder(questions: ApplicationQuestion[]): ApplicationQuestion[] {
  return questions.map((q, i) => ({ ...q, order: i }))
}
