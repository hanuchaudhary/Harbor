"use client";

import { CalendarIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  buttonVariant?:
    | "outline"
    | "ghost"
    | "default"
    | "destructive"
    | "secondary"
    | "link";
  dateFormat?: string;
  disabled?: (date: Date) => boolean;
  align?: "start" | "center" | "end";
  buttonClassName?: string;
  iconClassName?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  buttonVariant = "outline",
  dateFormat = "PPP",
  disabled,
  align = "start",
  buttonClassName,
  iconClassName = "mr-2 h-4 w-4",
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={buttonVariant}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            buttonClassName,
            className,
          )}
        >
          <CalendarIcon className={iconClassName} />
          {date ? formatDate(date, "custom", dateFormat) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
