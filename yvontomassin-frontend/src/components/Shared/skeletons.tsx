import Bone from "@/src/components/Shared/Bone";

export function MealCardSkeleton() {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.25)]">
      <div className="relative overflow-hidden rounded-xl bg-gray-100">
        <div className="aspect-square w-full animate-pulse bg-gradient-to-br from-gray-200 via-[#8F00FF]/5 to-gray-100" />
        <span className="absolute left-3 top-3 h-6 w-20 rounded-full bg-white/90 shadow-sm" />
      </div>
      <div className="pt-3">
        <Bone className="h-5 w-3/4" />
        <Bone className="mt-2 h-3 w-full" />
        <Bone className="mt-1.5 h-3 w-2/3" />
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex gap-3">
            {["w-12", "w-14", "w-16", "w-10"].map((w) => (
              <div key={w} className="flex-1">
                <Bone className={`h-4 ${w}`} />
                <Bone className="mt-1.5 h-2.5 w-10" />
              </div>
            ))}
          </div>
        </div>
        <Bone className="mt-4 h-11 w-full rounded-lg" />
        <Bone className="mt-2 h-9 w-full rounded-lg" />
      </div>
    </article>
  );
}

export function CheatPickerSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <article key={i} className="overflow-hidden rounded-xl border border-gray-100">
          <div className="aspect-square w-full animate-pulse bg-gray-100" />
          <div className="px-4 py-3">
            <Bone className="h-4 w-2/3" />
            <Bone className="mt-2 h-3 w-full" />
            <div className="mt-2 flex gap-3">
              <Bone className="h-3 w-14" />
              <Bone className="h-3 w-10" />
              <Bone className="h-3 w-10" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SavedItemSkeleton() {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-auto">
          <Bone className="h-5 w-48" />
          <Bone className="mt-2 h-3 w-32" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-28 rounded-full" />
          <Bone className="h-9 w-20 rounded-full" />
        </div>
      </div>
    </article>
  );
}

export function MealTableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 rounded-md" />
          <div>
            <Bone className="h-4 w-32" />
            <Bone className="mt-1.5 h-3 w-20" />
          </div>
        </div>
      </td>
      {Array.from({ length: columns - 1 }).map((_, j) => (
        <td key={j} className="px-4 py-3">
          <Bone className={`h-4 ${j === columns - 2 ? "ml-auto w-12" : "w-16"}`} />
        </td>
      ))}
    </tr>
  );
}

export function UserTableRowSkeleton() {
  return (
    <tr>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Bone className="h-9 w-9 rounded-full" />
          <Bone className="h-4 w-28" />
        </div>
      </td>
      <td className="px-5 py-3"><Bone className="h-4 w-40" /></td>
      <td className="px-5 py-3"><Bone className="h-5 w-16 rounded-full" /></td>
      <td className="px-5 py-3"><Bone className="h-4 w-14" /></td>
      <td className="px-5 py-3"><Bone className="h-4 w-20" /></td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-1.5">
          <Bone className="h-7 w-7 rounded-lg" />
          <Bone className="h-7 w-7 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f4f0] py-10" aria-busy="true">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
          <div className="h-32 animate-pulse bg-gradient-to-r from-gray-200 to-gray-100" />
          <div className="px-6 pb-8 sm:px-10">
            <Bone className="-mt-14 mb-4 h-24 w-24 rounded-full border-4 border-white" />
            <Bone className="h-7 w-48" />
            <Bone className="mt-2 h-4 w-56" />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl bg-white p-6">
          <Bone className="h-5 w-40" />
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="ml-auto h-10 w-36 rounded-xl" />
        </div>
        <div className="space-y-4 rounded-3xl bg-white p-6">
          <Bone className="h-5 w-36" />
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="ml-auto h-10 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
