"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2, Plus, Calendar, Tag, Search } from "lucide-react"
import { EditDialog } from "./edit-dialog"

interface KnowledgeItem {
  id: number
  created_at: string
  metadata?: any
}

interface R1Item extends KnowledgeItem {
  job_title: string
  job_description: string
  cover_letter: string
}

interface R2Item extends KnowledgeItem {
  project_title: string
  project_description: string
}

interface R3Item extends KnowledgeItem {
  skill_name: string
  skill_description: string
}

interface KnowledgeListProps {
  type: "r1" | "r2" | "r3"
  onAddNew: () => void
}

// Map types to their corresponding table endpoints
const getTableName = (type: "r1" | "r2" | "r3") => {
  switch (type) {
    case "r1":
      return "job-examples"
    case "r2":
      return "projects"
    case "r3":
      return "skills"
  }
}

export function KnowledgeList({ type, onAddNew }: KnowledgeListProps) {
  const [items, setItems] = useState<(R1Item | R2Item | R3Item)[]>([])
  const [filteredItems, setFilteredItems] = useState<(R1Item | R2Item | R3Item)[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = items.filter((item) => {
      switch (type) {
        case "r1":
          const r1Item = item as R1Item
          return (
            r1Item.job_title?.toLowerCase().includes(query) ||
            r1Item.job_description?.toLowerCase().includes(query) ||
            r1Item.cover_letter?.toLowerCase().includes(query)
          )
        case "r2":
          const r2Item = item as R2Item
          return (
            r2Item.project_title?.toLowerCase().includes(query) ||
            r2Item.project_description?.toLowerCase().includes(query)
          )
        case "r3":
          const r3Item = item as R3Item
          return (
            r3Item.skill_name?.toLowerCase().includes(query) || 
            r3Item.skill_description?.toLowerCase().includes(query)
          )
        default:
          return false
      }
    })
    setFilteredItems(filtered)
  }, [searchQuery, items, type])

  const fetchItems = async () => {
    try {
      const tableName = getTableName(type)
      const response = await fetch(`/api/knowledge/${tableName}`)
      const result = await response.json()

      if (result.success) {
        setItems(result.data || [])
      } else {
        throw new Error("Failed to fetch data")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [type])

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const tableName = getTableName(type)
      const response = await fetch(`/api/knowledge/${tableName}?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Item deleted successfully",
        })
        fetchItems() // Refresh the list
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
  }

  const handleEditSave = async (updatedItem: any) => {
    try {
      const tableName = getTableName(type)
      const response = await fetch(`/api/knowledge/${tableName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Item updated successfully",
        })
        setEditingItem(null)
        fetchItems() // Refresh the list
      } else {
        throw new Error("Failed to update")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      })
    }
  }

  const getTypeConfig = () => {
    switch (type) {
      case "r1":
        return {
          title: "Job Examples",
          emptyMessage: "No job examples yet. Add your first job example with its cover letter.",
          addButtonText: "Add Job Example",
        }
      case "r2":
        return {
          title: "Past Projects",
          emptyMessage: "No projects yet. Add your first successful project.",
          addButtonText: "Add Project",
        }
      case "r3":
        return {
          title: "Skills",
          emptyMessage: "No skills yet. Add your first skill.",
          addButtonText: "Add Skill",
        }
    }
  }

  const config = getTypeConfig()

  const renderItem = (item: R1Item | R2Item | R3Item) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString()
    }

    if (type === "r1") {
      const r1Item = item as R1Item
      return (
        <Card key={item.id} className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-white text-lg font-medium mb-2">{r1Item.job_title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4" />
                  {formatDate(item.created_at)}
                  {item.metadata?.wordCount && (
                    <>
                      <span>•</span>
                      <span>{item.metadata.wordCount} words</span>
                    </>
                  )}
                  {item.metadata?.company && (
                    <Badge variant="outline" className="text-xs">
                      {item.metadata.company}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-400 hover:bg-gray-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-gray-300 text-sm mb-3 line-clamp-3">{r1Item.job_description.substring(0, 200)}...</p>
            <div className="text-xs text-gray-500">Cover Letter: {r1Item.cover_letter.substring(0, 100)}...</div>
          </CardContent>
        </Card>
      )
    }

    if (type === "r2") {
      const r2Item = item as R2Item
      return (
        <Card key={item.id} className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-white text-lg font-medium mb-2">{r2Item.project_title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(item.created_at)}
                  {item.metadata?.wordCount && (
                    <>
                      <span>•</span>
                      <span>{item.metadata.wordCount} words</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.metadata?.projectType && (
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {item.metadata.projectType}
                    </Badge>
                  )}
                  {item.metadata?.technologies?.slice(0, 3).map((tech: string) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {item.metadata?.status && (
                    <Badge variant="secondary" className="text-xs">
                      {item.metadata.status}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-400 hover:bg-gray-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-gray-300 text-sm line-clamp-3">{r2Item.project_description.substring(0, 200)}...</p>
          </CardContent>
        </Card>
      )
    }

    if (type === "r3") {
      const r3Item = item as R3Item
      return (
        <Card key={item.id} className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-white text-lg font-medium mb-2">{r3Item.skill_name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(item.created_at)}
                </div>
                <div className="flex gap-2">
                  {item.metadata?.skillCategory && (
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {item.metadata.skillCategory}
                    </Badge>
                  )}
                  {item.metadata?.proficiencyLevel && (
                    <Badge variant="outline" className="text-xs">
                      {item.metadata.proficiencyLevel}
                    </Badge>
                  )}
                  {item.metadata?.yearsOfExperience && (
                    <Badge variant="secondary" className="text-xs">
                      {item.metadata.yearsOfExperience} years
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-400 hover:bg-gray-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-gray-300 text-sm line-clamp-3">{r3Item.skill_description.substring(0, 200)}...</p>
          </CardContent>
        </Card>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          {config.title} ({filteredItems.length})
        </h3>
        <Button onClick={onAddNew} className="bg-white text-black hover:bg-gray-200">
          <Plus className="h-4 w-4 mr-2" />
          {config.addButtonText}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={`Search ${config.title.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchQuery(e.target.value)
          }
          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
        />
      </div>

      {searchQuery && (
        <div className="text-sm text-gray-400">
          Found {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""} for "{searchQuery}"
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="py-8 text-center">
            <p className="text-gray-400 mb-4">
              {searchQuery ? `No results found for "${searchQuery}"` : config.emptyMessage}
            </p>
            {!searchQuery && (
              <Button onClick={onAddNew} className="bg-white text-black hover:bg-gray-200">
                <Plus className="h-4 w-4 mr-2" />
                {config.addButtonText}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">{filteredItems.map(renderItem)}</div>
      )}

      {editingItem && (
        <EditDialog type={type} item={editingItem} onSave={handleEditSave} onCancel={() => setEditingItem(null)} />
      )}
    </div>
  )
}